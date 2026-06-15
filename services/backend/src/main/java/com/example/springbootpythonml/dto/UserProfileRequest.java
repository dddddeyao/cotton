package com.example.springbootpythonml.dto;

import jakarta.validation.constraints.Size;

public class UserProfileRequest {

    @Size(max = 50, message = "昵称最多 50 个字符")
    private String nickname;

    @Size(max = 20, message = "手机号最多 20 个字符")
    private String phone;

    @Size(max = 100, message = "单位/机构最多 100 个字符")
    private String organization;

    @Size(max = 50, message = "身份最多 50 个字符")
    private String role;

    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getOrganization() { return organization; }
    public void setOrganization(String organization) { this.organization = organization; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}
