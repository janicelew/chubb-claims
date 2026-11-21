package com.chubb.claims.staff;

import com.chubb.claims.security.Role;
import jakarta.persistence.*;

/** A claims officer or manager. Seeded at start-up; used to show names on the workload dashboard. */
@Entity
@Table(name = "staff")
public class StaffMember {

    @Id
    private String id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    protected StaffMember() {
    }

    public StaffMember(String id, String name, Role role) {
        this.id = id;
        this.name = name;
        this.role = role;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public Role getRole() { return role; }
}
