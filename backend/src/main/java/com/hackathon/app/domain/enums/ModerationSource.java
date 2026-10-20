package com.hackathon.app.domain.enums;

/** Кто поставил оценку. */
public enum ModerationSource {
	/** Правила по словам и шаблонам (спам, ссылки, капс). */
	HEURISTIC,
	/** Нейросеть. */
	LLM,
	/** Классификатор токсичности (когда нейросеть выключена). */
	CLASSIFIER
}
