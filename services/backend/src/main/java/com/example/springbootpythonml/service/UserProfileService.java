package com.example.springbootpythonml.service;

import com.example.springbootpythonml.dto.UserProfileRequest;
import com.example.springbootpythonml.dto.UserProfileResponse;
import com.example.springbootpythonml.entity.User;
import com.example.springbootpythonml.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserProfileService {

    private final UserRepository userRepository;

    public UserProfileService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public UserProfileResponse getProfile(Long userId) {
        return UserProfileResponse.from(findUser(userId));
    }

    @Transactional
    public UserProfileResponse updateProfile(Long userId, UserProfileRequest request) {
        User user = findUser(userId);
        user.setNickname(normalize(request.getNickname()));
        user.setPhone(normalize(request.getPhone()));
        user.setOrganization(normalize(request.getOrganization()));
        user.setRole(normalize(request.getRole()));
        return UserProfileResponse.from(userRepository.save(user));
    }

    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

}
