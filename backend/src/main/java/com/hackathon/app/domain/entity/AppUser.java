package com.hackathon.app.domain.entity;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.domain.enums.AuthProvider;
import com.hackathon.app.domain.enums.SystemRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class AppUser {

    @Id
    private UUID id;
    private String username;
    private String email;
    private String passwordHash;
    private String firstName;
    private String lastName;
    private boolean active;
    @Enumerated(EnumType.STRING)
    private SystemRole systemRole;
    @Enumerated(EnumType.STRING)
    private AuthProvider authProvider;
    private Instant createdAt;
    /**
     * О себе.
     */
    private String bio;
    /**
     * Ссылка на аватар.
     */
    private String avatarUrl;
    /**
     * Город.
     */
    private String city;
    /** Имя питомца; null — имя по умолчанию «Бублик». */
    @Column(length = 30)
    private String petName;
    /** Баланс монет: кэш суммы журнала coin_ledger. */
    private int coins;
}
