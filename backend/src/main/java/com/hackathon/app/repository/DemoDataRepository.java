package com.hackathon.app.repository;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.domain.entity.AuditEntity;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * Только для демо-сида: Hibernate сам ставит createdAt/updatedAt «сейчас» при вставке, а живому проекту нужны
 * записи из прошлого. Bulk-update JPQL обходит генераторы и пишет дату как есть.
 */
@Repository
@RequiredArgsConstructor
public class DemoDataRepository {

    private final EntityManager em;

    /** createdAt и updatedAt записи → at. */
    public void backdate(Class<? extends AuditEntity> entity, UUID id, Instant at) {
        em.createQuery("update " + entity.getSimpleName() + " e set e.createdAt = :at, e.updatedAt = :at where e.id = :id")
                .setParameter("at", at)
                .setParameter("id", id)
                .executeUpdate();
    }

    /** Тысячи вставок в одной транзакции: сбрасываем контекст, иначе каждый flush перепроверяет все сущности. */
    public void flushAndClear() {
        em.flush();
        em.clear();
    }

    /** Анкета подана и рассмотрена в прошлом; reviewedAt = null — ещё на проверке. */
    public void backdateOrganization(UUID id, Instant submittedAt, Instant reviewedAt) {
        em.createQuery("""
                        update Organization o set o.createdAt = :submittedAt, o.submittedAt = :submittedAt,
                            o.updatedAt = :updatedAt
                        where o.id = :id""")
                .setParameter("submittedAt", submittedAt)
                .setParameter("updatedAt", reviewedAt != null ? reviewedAt : submittedAt)
                .setParameter("id", id)
                .executeUpdate();
        if (reviewedAt != null) { // у заявки на проверке reviewedAt и так null
            em.createQuery("update Organization o set o.reviewedAt = :reviewedAt where o.id = :id")
                    .setParameter("reviewedAt", reviewedAt)
                    .setParameter("id", id)
                    .executeUpdate();
        }
    }
}
