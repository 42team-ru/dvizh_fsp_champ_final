package com.hackathon.app.rest;

import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.dto.PetCatalogResponse;
import com.hackathon.app.domain.dto.PetBuySetRequest;
import com.hackathon.app.domain.dto.PetSaveLookRequest;
import com.hackathon.app.domain.dto.PetSavedLookResponse;
import com.hackathon.app.service.PetSavedLookService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.http.HttpStatus;
import com.hackathon.app.domain.dto.PetEquipRequest;
import com.hackathon.app.domain.dto.PetRequest;
import com.hackathon.app.domain.dto.PetRenameRequest;
import com.hackathon.app.domain.dto.PetResponse;
import com.hackathon.app.domain.dto.ShopItemResponse;
import com.hackathon.app.domain.dto.ShopBundleResponse;
import com.hackathon.app.service.PetBundleService;
import com.hackathon.app.service.PetCatalogService;
import com.hackathon.app.service.ShopService;
import com.hackathon.app.service.PetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Бобр-маскот в профиле: свой образ меняет только владелец (из JWT), чужой можно только смотреть. */
@Slf4j
@Tag(name = "pets", description = "Бобр-маскот: каталог вещей и образ")
@RestController
@RequestMapping(path = "/api", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
class PetController {

	private final PetService pets;
	private final PetCatalogService catalog;
	private final ShopService shop;
	/** Покупка и надевание готовых комплектов. */
	private final PetBundleService bundles;
	private final PetSavedLookService looks;

	@GetMapping("/pets/catalog")
	@Operation(operationId = "pets_catalog", summary = "Каталог: слоты и вещи",
			description = "Все встроенные вещи доступны всем; настроение вычисляется отдельно.")
	PetCatalogResponse catalog(@AuthenticationPrincipal Jwt jwt) {
		log.info("Endpoint called: GET /api/pets/catalog, userId={}", jwt.getSubject());
		var response = catalog.catalog();
		log.info("Endpoint response: GET /api/pets/catalog, slots={}", response.slots().size());
		return response;
	}

	@GetMapping("/pets/shop")
	@Operation(operationId = "pets_shop", summary = "Магазин: все вещи с ценой, видом и признаком «моя»",
			description = "Базовые вещи есть у всех, магазинные покупаются за монеты, эксклюзивы дают за достижения (поле hint).")
	List<ShopItemResponse> shop(@AuthenticationPrincipal Jwt jwt) {
		log.info("Endpoint called: GET /api/pets/shop, userId={}", jwt.getSubject());
		var response = shop.shop(userId(jwt));
		log.info("Endpoint response: GET /api/pets/shop, items={}", response.size());
		return response;
	}

	@GetMapping("/pets/shop/bundles")
	@Operation(operationId = "pets_bundles", summary = "Комплекты с персональной ценой и скидкой")
	List<ShopBundleResponse> bundles(@AuthenticationPrincipal Jwt jwt) {
		log.info("Endpoint called: GET /api/pets/shop/bundles, userId={}", jwt.getSubject());
		var response = bundles.bundles(userId(jwt));
		log.info("Endpoint response: GET /api/pets/shop/bundles, response={}", response);
		return response;
	}

	@PostMapping("/pets/shop/bundles/{code}/buy")
	@Operation(operationId = "pets_buyBundle", summary = "Купить недостающие вещи комплекта и надеть образ")
	@ApiResponse(responseCode = "200", description = "Комплект надет")
	@ApiResponse(responseCode = "403", description = "Только личный аккаунт", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ApiResponse(responseCode = "404", description = "Комплект не найден", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ApiResponse(responseCode = "409", description = "Не хватает монет или нужен эксклюзив", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	PetResponse buyBundle(@AuthenticationPrincipal Jwt jwt, @PathVariable String code) {
		log.info("Endpoint called: POST /api/pets/shop/bundles/{}/buy, userId={}", code, jwt.getSubject());
		var response = bundles.buy(userId(jwt), code);
		log.info("Endpoint response: POST /api/pets/shop/bundles/{}/buy, response={}", code, response);
		return response;
	}

    @PostMapping("/pets/shop/buy-set")
    @Operation(operationId = "pets_buySet", summary = "Купить примеренные вещи со скидкой 20% при двух и более")
    @ApiResponse(responseCode = "200", description = "Вещи куплены; текущий образ", content = @Content(schema = @Schema(implementation = PetResponse.class)))
    @ApiResponse(responseCode = "409", description = "Эксклюзив или недостаточно монет", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    PetResponse buySet(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody PetBuySetRequest request) {
        log.info("Endpoint called: POST /api/pets/shop/buy-set, userId={}, request={}", jwt.getSubject(), request);
        var response = bundles.buySet(userId(jwt), request);
        log.info("Endpoint response: POST /api/pets/shop/buy-set, response={}", response);
        return response;
    }

    @GetMapping("/users/me/pet/looks")
    @Operation(operationId = "pets_looks", summary = "Мои сохранённые образы")
    List<PetSavedLookResponse> looks(@AuthenticationPrincipal Jwt jwt) {
        log.info("Endpoint called: GET /api/users/me/pet/looks, userId={}", jwt.getSubject());
        var response = looks.list(userId(jwt));
        log.info("Endpoint response: GET /api/users/me/pet/looks, response={}", response);
        return response;
    }

    @PostMapping("/users/me/pet/looks")
    @Operation(operationId = "pets_saveLook", summary = "Сохранить образ из своих вещей; максимум четыре")
    @ApiResponse(responseCode = "200", description = "Образ сохранён", content = @Content(schema = @Schema(implementation = PetSavedLookResponse.class)))
    @ApiResponse(responseCode = "409", description = "Лимит образов или вещь не принадлежит владельцу", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    PetSavedLookResponse saveLook(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody PetSaveLookRequest request) {
        log.info("Endpoint called: POST /api/users/me/pet/looks, userId={}, request={}", jwt.getSubject(), request);
        var response = looks.save(userId(jwt), request);
        log.info("Endpoint response: POST /api/users/me/pet/looks, response={}", response);
        return response;
    }

    @DeleteMapping("/users/me/pet/looks/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(operationId = "pets_deleteLook", summary = "Удалить свой сохранённый образ")
    void deleteLook(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        log.info("Endpoint called: DELETE /api/users/me/pet/looks/{}, userId={}", id, jwt.getSubject());
        looks.delete(userId(jwt), id);
        log.info("Endpoint response: DELETE /api/users/me/pet/looks/{}, response=204", id);
    }

	@PostMapping("/pets/shop/{item}/buy")
	@Operation(operationId = "pets_buy", summary = "Купить вещь",
			description = "item — id вещи из магазина в виде слот:код, например hat:cap.")
	@ApiResponse(responseCode = "200", description = "Вещь куплена")
	@ApiResponse(responseCode = "404", description = "Нет такой вещи", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ApiResponse(responseCode = "409", description = "Не хватает монет, вещь уже есть или это эксклюзив", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	ShopItemResponse buy(@AuthenticationPrincipal Jwt jwt, @PathVariable String item) {
		log.info("Endpoint called: POST /api/pets/shop/{}/buy, userId={}", item, jwt.getSubject());
		var response = shop.buy(userId(jwt), item);
		log.info("Endpoint response: POST /api/pets/shop/{}/buy, response={}", item, response);
		return response;
	}

	@GetMapping("/users/me/pet")
	@Operation(operationId = "pets_getMine", summary = "Мой бобр")
	PetResponse getMine(@AuthenticationPrincipal Jwt jwt) {
		log.info("Endpoint called: GET /api/users/me/pet, userId={}", jwt.getSubject());
		var response = pets.get(userId(jwt));
		log.info("Endpoint response: GET /api/users/me/pet, response={}", response);
		return response;
	}

	@PutMapping("/users/me/pet")
	@Operation(operationId = "pets_saveMine", summary = "Сохранить образ целиком",
			description = "Чего нет в outfit — снимается. Неверный образ отклоняется целиком (400), сохранённый не меняется.")
	@ApiResponse(responseCode = "200", description = "OK")
	@ApiResponse(responseCode = "400", description = "Неизвестный слот или вещь", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	PetResponse saveMine(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody PetRequest request) {
		log.info("Endpoint called: PUT /api/users/me/pet, userId={}, request={}", jwt.getSubject(), request);
		var response = pets.save(userId(jwt), request);
		log.info("Endpoint response: PUT /api/users/me/pet, response={}", response);
		return response;
	}

	@PutMapping("/users/me/pet/name")
	@Operation(operationId = "pets_rename", summary = "Переименовать питомца")
	@ApiResponse(responseCode = "200", description = "Питомец с новым именем", content = @Content(schema = @Schema(implementation = PetResponse.class)))
	@ApiResponse(responseCode = "400", description = "Имя питомца — от 1 до 30 символов", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	PetResponse rename(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody PetRenameRequest request) {
		log.info("Endpoint called: PUT /api/users/me/pet/name, userId={}, request={}", jwt.getSubject(), request);
		var response = pets.rename(userId(jwt), request.name());
		log.info("Endpoint response: PUT /api/users/me/pet/name, response={}", response);
		return response;
	}

	@PostMapping("/users/me/pet/cheer")
	@Operation(operationId = "pets_cheer", summary = "Развеселить бобра",
			description = "Первый тычок или поглаживание: плохие новости до этого момента больше не портят настроение.")
	@ApiResponse(responseCode = "200", description = "Бобр с пересчитанным настроением", content = @Content(schema = @Schema(implementation = PetResponse.class)))
	PetResponse cheer(@AuthenticationPrincipal Jwt jwt) {
		log.info("Endpoint called: POST /api/users/me/pet/cheer, userId={}", jwt.getSubject());
		var response = pets.cheer(userId(jwt));
		log.info("Endpoint response: POST /api/users/me/pet/cheer, mood={}", response.mood());
		return response;
	}

	@PutMapping("/users/me/pet/slots/{slot}")
	@Operation(operationId = "pets_equip", summary = "Надеть или снять вещь в одном слоте",
			description = "Например, сменить головной убор: slot = hat, item = helmet. item = null — снять.")
	@ApiResponse(responseCode = "200", description = "OK")
	@ApiResponse(responseCode = "400", description = "Нет такой вещи в слоте", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ApiResponse(responseCode = "409", description = "Вещь ещё не куплена и не получена", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ApiResponse(responseCode = "404", description = "Нет такого слота", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	PetResponse equip(@AuthenticationPrincipal Jwt jwt, @PathVariable String slot,
			@RequestBody PetEquipRequest request) {
		log.info("Endpoint called: PUT /api/users/me/pet/slots/{}, userId={}, request={}", slot, jwt.getSubject(), request);
		var response = pets.equip(userId(jwt), slot, request.item());
		log.info("Endpoint response: PUT /api/users/me/pet/slots/{}, response={}", slot, response);
		return response;
	}


	@GetMapping("/users/{id}/pet")
	@Operation(operationId = "pets_getUser", summary = "Бобр другого пользователя", description = "Только образ, без данных аккаунта.")
	@ApiResponse(responseCode = "200", description = "OK")
	@ApiResponse(responseCode = "404", description = "Нет пользователя", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	PetResponse getUser(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
		log.info("Endpoint called: GET /api/users/{}/pet, userId={}", id, jwt.getSubject());
		var response = pets.getPublic(id);
		log.info("Endpoint response: GET /api/users/{}/pet, response={}", id, response);
		return response;
	}

	private static UUID userId(Jwt jwt) {
		return UUID.fromString(jwt.getSubject());
	}
}
