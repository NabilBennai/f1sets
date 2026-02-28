package com.nabilbennai.f1sets.config;

import com.nabilbennai.f1sets.model.entities.User;
import com.nabilbennai.f1sets.model.enums.UserRole;
import java.util.Collection;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public class AppUserPrincipal implements UserDetails {

  private final Long id;
  private final String email;
  private final String passwordHash;
  private final boolean enabled;
  private final UserRole role;

  public AppUserPrincipal(User user) {
    this.id = user.getId();
    this.email = user.getEmail();
    this.passwordHash = user.getPasswordHash();
    this.enabled = user.isEnabled();
    this.role = user.getRole();
  }

  public Long getId() {
    return id;
  }

  public UserRole getRole() {
    return role;
  }

  @Override
  public Collection<? extends GrantedAuthority> getAuthorities() {
    return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
  }

  @Override
  public String getPassword() {
    return passwordHash;
  }

  @Override
  public String getUsername() {
    return email;
  }

  @Override
  public boolean isEnabled() {
    return enabled;
  }
}
