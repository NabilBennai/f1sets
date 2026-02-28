package com.nabilbennai.f1sets.config;

import com.nabilbennai.f1sets.dao.UserRepository;
import com.nabilbennai.f1sets.miscellaneous.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AppUserDetailsService implements UserDetailsService {

  private final UserRepository userRepository;

  @Override
  public UserDetails loadUserByUsername(String username) {
    return userRepository
        .findByEmail(normalizeEmail(username))
        .map(AppUserPrincipal::new)
        .orElseThrow(() -> new UnauthorizedException("Invalid credentials"));
  }

  private String normalizeEmail(String email) {
    return email == null ? "" : email.trim().toLowerCase();
  }
}
