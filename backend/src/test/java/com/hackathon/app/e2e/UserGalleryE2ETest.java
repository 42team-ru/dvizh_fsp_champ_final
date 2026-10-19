package com.hackathon.app.e2e;

import static com.hackathon.app.e2e.support.ApiAssertions.assertThatApi;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.HttpStatus.*;

import java.util.Base64;
import java.util.UUID;

import com.hackathon.app.e2e.support.TestApi;
import com.hackathon.app.repository.AppUserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("h2")
class UserGalleryE2ETest {
    private static final byte[] PNG = Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9gAAAABJRU5ErkJggg==");
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired AppUserRepository users;
    @Autowired PasswordEncoder passwords;
    TestApi api;

    @BeforeEach
    void setUp() {
        api = new TestApi(mvc, json, users, passwords);
    }

    /**
     * ФЛОУ: человек загружает фотографии профиля, другой видит их, аватар остаётся отдельным.
     * ШАГИ: 1. Создать владельца и зрителя, загрузить аватар и два фото.
     * 2. Перечитать галерею и публичный профиль, скачать фото от имени зрителя.
     * 3. Удалить первое фото, заменить и удалить аватар; перечитать оставшуюся галерею.
     * ПРОВЕРЯЕМ: фото упорядочены по загрузке, байты доступны зрителю; изменение галереи не меняет аватар,
     * изменение аватара не удаляет фото; после удаления публичный профиль содержит оставшийся снимок.
     * ПОЧЕМУ ВАЖНО: личные фотографии должны сохраняться и показываться независимо от картинки профиля.
     */
    @Test
    void galleryIsVisibleInProfileAndIndependentOfAvatar() {
        var owner = api.newUser("gallery");
        var viewer = api.newUser("galleryViewer");
        assertThat(owner.myPhotos()).isEmpty();
        var avatar = owner.uploadAvatar(PNG).avatarUrl();
        var first = owner.addProfilePhoto("first.png", "image/png", PNG).getFirst();
        var all = owner.addProfilePhoto("second.png", "image/png", PNG);
        assertThat(all).extracting(photo -> photo.name()).containsExactly("first.png", "second.png");
        assertThat(owner.myPhotos()).isEqualTo(all);
        assertThat(viewer.openUser(owner.id()).photos()).isEqualTo(all);
        assertThat(viewer.downloadFile(first.id())).isEqualTo(PNG);
        assertThat(owner.me().avatarUrl()).isEqualTo(avatar);

        assertThat(owner.removeProfilePhoto(first.id())).containsExactly(all.getLast());
        assertThat(owner.me().avatarUrl()).isEqualTo(avatar);
        assertThat(owner.uploadAvatar(PNG).avatarUrl()).isNotEqualTo(avatar);
        assertThat(owner.deleteAvatar().avatarUrl()).isNull();
        assertThat(owner.myPhotos()).containsExactly(all.getLast());
        assertThat(viewer.openUser(owner.id()).photos()).containsExactly(all.getLast());
        assertThat(owner.removeProfilePhoto(all.getLast().id())).isEmpty();
    }

    /**
     * ФЛОУ: сервер отклоняет неподходящие файлы и переполнение галереи без потери фотографий.
     * ШАГИ: 1. Отправить пустой файл, текст под видом PNG, PDF и изображение больше 5 МБ.
     * 2. Загрузить шесть допустимых фото, седьмое отклонить. 3. Удалить фото и загрузить новое.
     * ПРОВЕРЯЕМ: неверные файлы дают 400, заполненная галерея — 409; после отказа шесть фото сохранены,
     * после удаления освободившееся место снова доступно.
     * ПОЧЕМУ ВАЖНО: ограничения должны работать на сервере и не оставлять повреждённых записей.
     */
    @Test
    void validatesContentSizeAndGalleryLimit() {
        var owner = api.newUser("galleryLimits");
        assertThatApi(() -> owner.addProfilePhoto("empty.png", "image/png", new byte[0])).fails(BAD_REQUEST, "Файл пустой");
        assertThatApi(() -> owner.addProfilePhoto("fake.png", "image/png", "text".getBytes())).fails(BAD_REQUEST);
        assertThatApi(() -> owner.addProfilePhoto("file.pdf", "application/pdf", "%PDF-1.7".getBytes())).fails(BAD_REQUEST);
        var large = java.util.Arrays.copyOf(PNG, 5 * 1024 * 1024 + 1);
        assertThatApi(() -> owner.addProfilePhoto("large.png", "image/png", large)).fails(BAD_REQUEST, "Файл слишком большой: максимум 5 МБ");
        assertThat(owner.myPhotos()).isEmpty();
        for (int i = 0; i < 6; i++) {
            owner.addProfilePhoto("photo" + i + ".png", "image/png", PNG);
        }
        var full = owner.myPhotos();
        assertThatApi(() -> owner.addProfilePhoto("extra.png", "image/png", PNG))
                .fails(CONFLICT, "Можно загрузить не больше 6 фото");
        assertThat(owner.myPhotos()).isEqualTo(full);
        owner.removeProfilePhoto(full.getFirst().id());
        assertThat(owner.addProfilePhoto("replacement.png", "image/png", PNG)).hasSize(6);
    }

    /**
     * ФЛОУ: управлять можно только собственными фотографиями галереи; аватары через неё не удаляются.
     * ШАГИ: 1. Владелец загружает фото и аватар, другой пользователь пытается удалить это фото.
     * 2. Владелец пытается удалить аватар и неизвестный id через API галереи.
     * 3. Гость пытается читать галерею, добавлять и удалять фото.
     * ПРОВЕРЯЕМ: чужое фото, аватар и неизвестный id дают 404; без входа — 401;
     * исходное фото и аватар после всех попыток остаются на месте.
     * ПОЧЕМУ ВАЖНО: знание ссылки на файл не даёт права удалять чужие фотографии или аватар.
     */
    @Test
    void rejectsForeignFilesAvatarsAndAnonymousRequests() {
        var owner = api.newUser("galleryOwner");
        var stranger = api.newUser("galleryStranger");
        var photo = owner.addProfilePhoto("photo.png", "image/png", PNG).getFirst();
        var avatar = owner.uploadAvatar(PNG).avatarUrl();
        var avatarId = UUID.fromString(avatar.substring(avatar.lastIndexOf('/') + 1));
        assertThatApi(() -> stranger.removeProfilePhoto(photo.id())).fails(NOT_FOUND, "Файл не найден");
        assertThatApi(() -> owner.removeProfilePhoto(avatarId)).fails(NOT_FOUND, "Файл не найден");
        assertThatApi(() -> owner.removeProfilePhoto(UUID.randomUUID())).fails(NOT_FOUND);
        assertThatApi(() -> api.guest().myPhotos()).fails(UNAUTHORIZED);
        assertThatApi(() -> api.guest().addProfilePhoto("photo.png", "image/png", PNG)).fails(UNAUTHORIZED);
        assertThatApi(() -> api.guest().removeProfilePhoto(photo.id())).fails(UNAUTHORIZED);
        assertThat(owner.myPhotos()).containsExactly(photo);
        assertThat(owner.me().avatarUrl()).isEqualTo(avatar);
    }
}
