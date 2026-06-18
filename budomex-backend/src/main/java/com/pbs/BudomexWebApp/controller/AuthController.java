package com.pbs.BudomexWebApp.controller;

import com.pbs.BudomexWebApp.dto.LoginRequest;
import com.pbs.BudomexWebApp.repository.UserRepository;
import com.pbs.BudomexWebApp.security.JwtUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.ReactiveAuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final ReactiveAuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final UserRepository userRepository;

    @PostMapping("/login")
    public Mono<ResponseEntity<Map<String, Object>>> authenticateUser(@Valid @RequestBody Mono<LoginRequest> loginRequestMono) {
        return loginRequestMono.flatMap(loginRequest ->
                authenticationManager.authenticate(
                                new UsernamePasswordAuthenticationToken(loginRequest.username(), loginRequest.password()))
                        .flatMap(authentication -> {
                            String jwt = jwtUtils.generateJwtToken(authentication);

                            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
                            List<String> roles = userDetails.getAuthorities().stream()
                                    .map(GrantedAuthority::getAuthority)
                                    .toList();

                            Map<String, Object> response = new HashMap<>();
                            response.put("token", jwt);
                            response.put("username", userDetails.getUsername());
                            response.put("roles", roles);

                            return userRepository.findByUsername(userDetails.getUsername())
                                    .map(user -> {
                                        response.put("firstName", user.getFirstName());
                                        response.put("lastName", user.getLastName());
                                        response.put("fullName",
                                                ((user.getFirstName() != null ? user.getFirstName() : "")
                                                        + " " + (user.getLastName() != null ? user.getLastName() : "")).trim());
                                        return response;
                                    })
                                    .defaultIfEmpty(response);
                        })
                        .map(ResponseEntity::ok)
        );
    }
}
