package com.chubb.claims.staff;

import com.chubb.claims.security.Role;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StaffRepository extends JpaRepository<StaffMember, String> {

    List<StaffMember> findByRole(Role role);
}
