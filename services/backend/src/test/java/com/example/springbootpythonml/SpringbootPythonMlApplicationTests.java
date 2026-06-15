package com.example.springbootpythonml;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.example.springbootpythonml.entity.RecognitionRecord;
import com.example.springbootpythonml.entity.User;
import com.example.springbootpythonml.repository.RecognitionRecordRepository;
import com.example.springbootpythonml.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.blankOrNullString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
@SpringBootTest
@ActiveProfiles("test")
class SpringbootPythonMlApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RecognitionRecordRepository recordRepository;

    @Test
    void contextLoads() {
    }

    @Test
    void accountProfileAndPasswordFlowWorks() throws Exception {
        String username = "tester_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        String password = "password123";
        String newPassword = "newpass456";

        String registerResponse = mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("username", username, "password", password))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.username").value(username))
                .andExpect(jsonPath("$.data.token", not(blankOrNullString())))
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8);

        String token = tokenFrom(registerResponse);

        mockMvc.perform(get("/user/profile").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value(username));

        mockMvc.perform(put("/user/profile")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "nickname", "  Cotton User  ",
                                "phone", "13800138000",
                                "organization", "Cotton Lab",
                                "role", "质检员"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nickname").value("Cotton User"))
                .andExpect(jsonPath("$.data.phone").value("13800138000"))
                .andExpect(jsonPath("$.data.organization").value("Cotton Lab"))
                .andExpect(jsonPath("$.data.role").value("质检员"));

        mockMvc.perform(post("/auth/change-password")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("oldPassword", "wrong-password", "newPassword", newPassword))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("当前密码错误"));

        mockMvc.perform(post("/auth/change-password")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("oldPassword", password, "newPassword", newPassword))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("密码已修改"));

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("username", username, "password", password))))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("username", username, "password", newPassword))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.token", not(blankOrNullString())));
    }

    @Test
    void protectedAccountEndpointsReturnJsonUnauthorized() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ok"));

        mockMvc.perform(get("/uploads/not-found.jpg"))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/news"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/user/profile"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value(401))
                .andExpect(jsonPath("$.message").value("请先登录"));

        mockMvc.perform(post("/auth/change-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("oldPassword", "password123", "newPassword", "newpass456"))))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value(401))
                .andExpect(jsonPath("$.message").value("请先登录"));

        mockMvc.perform(get("/unknown/private-path"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.message").value("请先登录"));
    }

    @Test
    void legacyUploadEndpointIsPublicAndValidatesEmptyFile() throws Exception {
        MockMultipartFile emptyFile = new MockMultipartFile(
                "file",
                "empty.jpg",
                MediaType.IMAGE_JPEG_VALUE,
                new byte[0]);

        mockMvc.perform(multipart("/api/v1/upload").file(emptyFile))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("请上传图片文件"));
    }

    @Test
    void recognitionHistoryIsScopedToCurrentUserAndSupportsBatchDelete() throws Exception {
        String ownerToken = registerAndReturnToken("owner_" + suffix(), "password123");
        String otherToken = registerAndReturnToken("other_" + suffix(), "password123");
        User owner = userRepository.findByUsername(usernameFromToken(ownerToken)).orElseThrow();
        User other = userRepository.findByUsername(usernameFromToken(otherToken)).orElseThrow();

        RecognitionRecord ownerRecord = saveRecord(owner.getId(), "owner.jpg", 1);
        RecognitionRecord otherRecord = saveRecord(other.getId(), "other.jpg", 2);

        mockMvc.perform(get("/recognition/history").header(HttpHeaders.AUTHORIZATION, bearer(ownerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].id").value(ownerRecord.getId()))
                .andExpect(jsonPath("$.data[0].imageUri").value("owner.jpg"));

        mockMvc.perform(get("/recognition/history"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("请先登录"));

        mockMvc.perform(delete("/recognition/history")
                        .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("ids", List.of()))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("请指定要删除的记录"));

        mockMvc.perform(delete("/recognition/history")
                        .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("ids", List.of(ownerRecord.getId(), otherRecord.getId())))))
                .andExpect(status().isOk());

        mockMvc.perform(get("/recognition/history").header(HttpHeaders.AUTHORIZATION, bearer(ownerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));

        mockMvc.perform(get("/recognition/history").header(HttpHeaders.AUTHORIZATION, bearer(otherToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].id").value(otherRecord.getId()));
    }

    private String json(Object value) throws Exception {
        return objectMapper.writeValueAsString(value);
    }

    private String tokenFrom(String responseBody) throws Exception {
        JsonNode body = objectMapper.readTree(responseBody);
        return body.path("data").path("token").asText();
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }

    private String registerAndReturnToken(String username, String password) throws Exception {
        String response = mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("username", username, "password", password))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8);
        return tokenFrom(response);
    }

    private RecognitionRecord saveRecord(Long userId, String imageUri, int colorGrade) {
        RecognitionRecord record = new RecognitionRecord();
        record.setUserId(userId);
        record.setImageUri(imageUri);
        record.setColorGrade(colorGrade);
        record.setImpurityGrade(colorGrade);
        record.setCottonArea(72.5);
        record.setImpurityArea(12);
        record.setAreaRatio(0.03);
        record.setConfidence(0.91);
        record.setConclusion("等级 " + colorGrade);
        return recordRepository.save(record);
    }

    private String usernameFromToken(String token) throws Exception {
        mockMvc.perform(get("/user/profile").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk());
        String body = mockMvc.perform(get("/user/profile").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8);
        return objectMapper.readTree(body).path("data").path("username").asText();
    }

    private String suffix() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }
}
