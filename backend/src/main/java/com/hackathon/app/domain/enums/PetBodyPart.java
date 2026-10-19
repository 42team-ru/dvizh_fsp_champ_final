package com.hackathon.app.domain.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Часть тела, на которую админ надевает свою вещь. Определяет слот каталога (что с чем взаимоисключается)
 * и рамку посадки; сами рамки в координатах рисунка — в pet_item_import.py.
 */
@Getter
@RequiredArgsConstructor
public enum PetBodyPart {
    /** На голову: шапка, корона. Слот hat. */
    HEAD("hat"),
    /** На глаза: очки, маска. Слот eyewear. */
    EYES("eyewear"),
    /** На шею: медаль, шарф. Слот neck. */
    NECK("neck"),
    /** На грудь: принт или эмблема, занимает слот одежды shirt. */
    CHEST("shirt"),
    /** Низ: шорты, юбка, обувь. Слот bottom. */
    LEGS("bottom"),
    /** В правую лапу: ракетка, кубок. Слот инвентаря activity. */
    PAW("activity"),
    /** Рядом на земле справа: мяч, тренажёр. Слот инвентаря activity. */
    GROUND("activity");

    /** Код слота каталога, в который попадает вещь. */
    private final String slotCode;
}
