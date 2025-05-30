package edu.ucsb.cs156.dining.testconfig;

import edu.ucsb.cs156.dining.entities.User;
import edu.ucsb.cs156.dining.services.CurrentUserServiceImpl;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.stereotype.Service;

@Service("testingUser")
public class MockCurrentUserServiceImpl extends CurrentUserServiceImpl {

  public User getMockUser(SecurityContext securityContext, Authentication authentication) {
    Object principal = authentication.getPrincipal();

    String googleSub = "fakeUser";
    String email = "user@example.org";
    String pictureUrl = "https://example.org/fake.jpg";
    String fullName = "Fake User";
    String givenName = "Fake";
    String familyName = "User";
    boolean emailVerified = true;
    String locale="";
    String hostedDomain="example.org";
    boolean admin=false;
    boolean moderator=false;

    org.springframework.security.core.userdetails.User user = null;


    if (principal instanceof org.springframework.security.core.userdetails.User) {
      user = (org.springframework.security.core.userdetails.User) principal;
      googleSub = "fake_" + user.getUsername();
      email = user.getUsername() + "@example.org";
      pictureUrl = "https://example.org/" +  user.getUsername() + ".jpg";
      fullName = "Fake " + user.getUsername();
      givenName = "Fake";
      familyName = user.getUsername();
      emailVerified = true;
      locale="";
      hostedDomain="example.org";
      admin= securityContext.getAuthentication().getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"));
      moderator= securityContext.getAuthentication().getAuthorities().contains(new SimpleGrantedAuthority("ROLE_MODERATOR"));
    }

    User u = User.builder()
    .googleSub(googleSub)
    .email(email)
    .pictureUrl(pictureUrl)
    .fullName(fullName)
    .givenName(givenName)
    .familyName(familyName)
    .emailVerified(emailVerified)
    .locale(locale)
    .hostedDomain(hostedDomain)
    .admin(admin)
    .moderator(moderator)
    .id(1L)
    .build();
    
    return u;
  }

  public User getUser() {
    SecurityContext securityContext = SecurityContextHolder.getContext();
    Authentication authentication = securityContext.getAuthentication();

    if (!(authentication instanceof OAuth2AuthenticationToken)) {
      return getMockUser(securityContext, authentication);
    }

    return null;
  }

}
