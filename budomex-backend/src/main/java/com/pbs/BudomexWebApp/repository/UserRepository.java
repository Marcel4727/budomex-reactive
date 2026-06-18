package com.pbs.BudomexWebApp.repository;

import com.pbs.BudomexWebApp.entity.User;
import com.pbs.BudomexWebApp.entity.UserRole;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface UserRepository extends R2dbcRepository<User, Long> {

    Mono<User> findByUsername(String username);

    Mono<Boolean> existsByUsername(String username);

    Flux<User> findByRole(UserRole role);
}
