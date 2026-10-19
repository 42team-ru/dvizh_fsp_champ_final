package com.hackathon.app.repository;

import java.time.Instant;
import java.util.*;
import com.hackathon.app.domain.entity.TelegramUpdateReceipt;
import com.hackathon.app.domain.enums.*;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;

/** Доступ к состоянию уведомлений. */
public interface TelegramUpdateReceiptRepository extends JpaRepository<TelegramUpdateReceipt, UUID> {
    boolean existsByUpdateId(Long updateId);
    List<TelegramUpdateReceipt> findByCreatedAtBefore(Instant cutoff);
}
