package com.hackathon.app.service;

import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.zip.CRC32;
import java.util.zip.Deflater;

import com.hackathon.app.domain.dto.FileUpload;
import com.hackathon.app.domain.dto.PetRequest;
import com.hackathon.app.repository.PetItemRepository;
import com.hackathon.app.repository.PetSlotRepository;
import com.hackathon.app.repository.UserPetEquipmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Демо-данные бобра (часть DemoSeeder, только при DEMO_MODE=true): новые слоты и вещи, добавленные «как админ» —
 * с картинкой в S3, плюс готовые образы у Анны, Петра и Ольги. Массовые образы — в DemoBulkSeeder.
 * Идемпотентно: слот и вещь ищутся по коду, образ ставится только тем, у кого он ещё пустой.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DemoPetSeeder {

    /** Фигура на картинке-заглушке: настоящие картинки админ загрузит сам. */
    enum Shape { CIRCLE, RING, SQUARE, DIAMOND, STAR, TRIANGLE }

    private record AdminSlot(String code, String label) {
    }

    private record AdminItem(String slot, String code, String label, Shape shape, int rgb) {
    }

    private static final List<AdminSlot> SLOTS = List.of(
            new AdminSlot("gloves", "Перчатки"),
            new AdminSlot("back", "За спиной"));

    private static final List<AdminItem> ITEMS = List.of(
            new AdminItem("hat", "golden-crown", "Золотая корона чемпиона", Shape.STAR, 0xF4C431),
            new AdminItem("hat", "bike-helmet", "Велошлем", Shape.CIRCLE, 0x2E7D32),
            new AdminItem("hat", "laurel-wreath", "Лавровый венок", Shape.RING, 0x7CB342),
            new AdminItem("eyewear", "ski-mask", "Горнолыжная маска", Shape.SQUARE, 0x1E88E5),
            new AdminItem("neck", "yenisey-scarf", "Шарф болельщика «Енисея»", Shape.SQUARE, 0xD32A32),
            new AdminItem("neck", "finisher-medal", "Медаль финишера марафона", Shape.CIRCLE, 0xC0A060),
            new AdminItem("activity", "trophy", "Кубок победителя", Shape.TRIANGLE, 0xE0A100),
            new AdminItem("activity", "tennis-racket", "Теннисная ракетка", Shape.RING, 0x8E24AA),
            new AdminItem("activity", "jump-rope", "Скакалка", Shape.RING, 0xF06292),
            new AdminItem("gloves", "boxing-gloves", "Боксёрские перчатки", Shape.CIRCLE, 0xB71C1C),
            new AdminItem("gloves", "goalkeeper-gloves", "Вратарские перчатки", Shape.SQUARE, 0x43A047),
            new AdminItem("gloves", "cycling-gloves", "Велоперчатки", Shape.DIAMOND, 0x37474F),
            new AdminItem("back", "backpack", "Спортивный рюкзак", Shape.SQUARE, 0x5D4037),
            new AdminItem("back", "snowboard", "Сноуборд", Shape.DIAMOND, 0x00ACC1),
            new AdminItem("back", "sup-paddle", "Весло для сапа", Shape.TRIANGLE, 0xFB8C00));

    private final AdminPetService adminPets;
    private final PetService pets;
    private final PetSlotRepository slots;
    private final PetItemRepository items;
    private final UserPetEquipmentRepository equipment;

    @Transactional
    public void seed(Map<String, UUID> userIds) {
        for (var slot : SLOTS) {
            if (!slots.existsByCode(slot.code())) {
                adminPets.createSlot(slot.code(), slot.label());
            }
        }
        for (var item : ITEMS) {
            var slot = slots.findByCode(item.slot()).orElseThrow();
            if (!items.existsBySlotIdAndCode(slot.getId(), item.code())) {
                adminPets.createItem(item.slot(), item.code(), item.label(),
                        new FileUpload(item.code() + ".png", png(item.shape(), item.rgb())), userIds.get("admin"));
            }
        }
        look(userIds.get("anna"), new PetRequest("happy", "juggle", Map.of("shirt", "yenisey", "hat", "cap")));
        look(userIds.get("petr"), new PetRequest("thinking", "chess", Map.of("shirt", "training", "neck", "finisher-medal")));
        look(userIds.get("olga"), new PetRequest("happy", "lift", Map.of("shirt", "training", "neck", "whistle",
                "hat", "laurel-wreath")));
    }

    /** Образ ставим только пустому бобру: что пользователь надел сам, не трогаем. */
    private void look(UUID userId, PetRequest request) {
        if (equipment.findByUserId(userId).isEmpty()) {
            pets.save(userId, request);
        }
    }

    /** PNG 128×128 с фигурой заданного цвета на прозрачном фоне — без AWT, чтобы работало в любом образе JRE. */
    static byte[] png(Shape shape, int rgb) {
        int size = 128;
        var raw = new ByteArrayOutputStream();
        for (int y = 0; y < size; y++) {
            raw.write(0); // фильтр строки: None
            for (int x = 0; x < size; x++) {
                // координаты в [-1; 1], центр картинки — (0; 0)
                double nx = (x + 0.5) / size * 2 - 1;
                double ny = (y + 0.5) / size * 2 - 1;
                raw.write((rgb >> 16) & 0xFF);
                raw.write((rgb >> 8) & 0xFF);
                raw.write(rgb & 0xFF);
                raw.write(inside(shape, nx, ny) ? 0xFF : 0x00);
            }
        }
        var png = new ByteArrayOutputStream();
        png.writeBytes(new byte[] { (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A });
        chunk(png, "IHDR", ByteBuffer.allocate(13).putInt(size).putInt(size)
                .put((byte) 8).put((byte) 6).put((byte) 0).put((byte) 0).put((byte) 0).array()); // 8 бит, RGBA
        chunk(png, "IDAT", deflate(raw.toByteArray()));
        chunk(png, "IEND", new byte[0]);
        return png.toByteArray();
    }

    private static boolean inside(Shape shape, double x, double y) {
        double r = Math.hypot(x, y);
        return switch (shape) {
            case CIRCLE -> r <= 0.9;
            case RING -> r <= 0.9 && r >= 0.6;
            case SQUARE -> Math.abs(x) <= 0.75 && Math.abs(y) <= 0.75;
            case DIAMOND -> Math.abs(x) + Math.abs(y) <= 0.9;
            // вершина сверху (y = -0.85), основание внизу (y = 0.75) шириной 1.7
            case TRIANGLE -> y >= -0.85 && y <= 0.75 && Math.abs(x) <= (y + 0.85) / 1.6 * 0.85;
            case STAR -> star(x, y);
        };
    }

    /** Пятиконечная звезда: точка внутри многоугольника из 10 вершин. */
    private static boolean star(double x, double y) {
        int n = 10;
        double[] px = new double[n];
        double[] py = new double[n];
        for (int i = 0; i < n; i++) {
            double radius = i % 2 == 0 ? 0.92 : 0.4;
            double angle = -Math.PI / 2 + i * Math.PI / 5;
            px[i] = radius * Math.cos(angle);
            py[i] = radius * Math.sin(angle);
        }
        boolean in = false;
        for (int i = 0, j = n - 1; i < n; j = i++) {
            if ((py[i] > y) != (py[j] > y) && x < (px[j] - px[i]) * (y - py[i]) / (py[j] - py[i]) + px[i]) {
                in = !in;
            }
        }
        return in;
    }

    private static void chunk(ByteArrayOutputStream out, String type, byte[] data) {
        var typeBytes = type.getBytes(StandardCharsets.US_ASCII);
        out.writeBytes(ByteBuffer.allocate(4).putInt(data.length).array());
        out.writeBytes(typeBytes);
        out.writeBytes(data);
        var crc = new CRC32();
        crc.update(typeBytes);
        crc.update(data);
        out.writeBytes(ByteBuffer.allocate(4).putInt((int) crc.getValue()).array());
    }

    private static byte[] deflate(byte[] data) {
        var deflater = new Deflater(Deflater.BEST_COMPRESSION);
        deflater.setInput(data);
        deflater.finish();
        var out = new ByteArrayOutputStream();
        var buffer = new byte[8192];
        while (!deflater.finished()) {
            out.write(buffer, 0, deflater.deflate(buffer));
        }
        deflater.end();
        return out.toByteArray();
    }
}
