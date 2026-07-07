package com.example.springbootpythonml;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.example.springbootpythonml.config.NewsCrawlerProperties;
import com.example.springbootpythonml.dto.RecognitionHistoryItem;
import com.example.springbootpythonml.dto.RecognitionResult;
import com.example.springbootpythonml.entity.News;
import com.example.springbootpythonml.entity.RecognitionRecord;
import com.example.springbootpythonml.entity.User;
import com.example.springbootpythonml.repository.NewsRepository;
import com.example.springbootpythonml.repository.RecognitionRecordRepository;
import com.example.springbootpythonml.repository.UserRepository;
import com.example.springbootpythonml.service.RecognitionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.client.RestTemplate;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
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
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

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


    @Autowired
    private NewsRepository newsRepository;

    @Autowired
    private RecognitionService recognitionService;

    @Autowired
    private NewsCrawlerProperties newsCrawlerProperties;

    @Autowired
    private RestTemplate restTemplate;

    @Value("${app.upload-dir}")
    private String uploadDir;

    @Test
    void contextLoads() {
    }

    @Test
    void newsCrawlerKeywordsKeepCottonAndCustoms() {
        assertThat(newsCrawlerProperties.getIncludeKeywords()).contains("棉花", "海关");
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
    void newsEndpointDefaultsToPageSizeTen() throws Exception {
        newsRepository.deleteAll();
        for (int i = 0; i < 11; i++) {
            newsRepository.save(news("分页资讯" + i, "/uploads/news/page-" + i + ".png"));
        }
        newsRepository.save(news("无图资讯", ""));

        mockMvc.perform(get("/news"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.page").value(0))
                .andExpect(jsonPath("$.data.size").value(10))
                .andExpect(jsonPath("$.data.items.length()").value(10))
                .andExpect(jsonPath("$.data.total").value(12))
                .andExpect(jsonPath("$.data.hasMore").value(true));
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
    void recognitionEndpointsRejectNonImagePayloads() throws Exception {
        MockMultipartFile fakeFile = new MockMultipartFile(
                "file",
                "fake.jpg",
                MediaType.IMAGE_JPEG_VALUE,
                "not-an-image".getBytes(StandardCharsets.UTF_8));

        mockMvc.perform(multipart("/recognition").file(fakeFile))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("图片数据格式不正确"));

        mockMvc.perform(post("/recognition/base64")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "imageBase64", "bm90LWFuLWltYWdl",
                                "filename", "fake.jpg",
                                "contentType", MediaType.IMAGE_JPEG_VALUE))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("图片数据格式不正确"));
    }

    @Test
    void recognitionEndpointHidesModelErrorDetails() throws Exception {
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        server.expect(requestTo("http://127.0.0.1:5000/predict?images=0"))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":\"secret model stack trace\"," +
                                "\"detectionResult\":{\"colorGrade\":-1}}"));

        MockMultipartFile imageFile = new MockMultipartFile(
                "file",
                "sample.png",
                MediaType.IMAGE_PNG_VALUE,
                tinyPngBytes());

        mockMvc.perform(multipart("/recognition").file(imageFile).param("images", "0"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.message").value("模型服务暂时不可用，请稍后重试"));

        server.verify();
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
                .andExpect(jsonPath("$.data[0].imageUri").value("owner.jpg"))
                .andExpect(jsonPath("$.data[0].cottonAreaImage").value("data:image/jpeg;base64,cotton-1"))
                .andExpect(jsonPath("$.data[0].impurityAreaImage").value("data:image/png;base64,impurity-1"))
                .andExpect(jsonPath("$.data[0].cottonMaskImage").value("data:image/png;base64,cotton-mask-1"))
                .andExpect(jsonPath("$.data[0].impurityMaskImage").value("data:image/png;base64,impurity-mask-1"))
                .andExpect(jsonPath("$.data[0].cottonOverlayImage").value("data:image/png;base64,cotton-overlay-1"))
                .andExpect(jsonPath("$.data[0].impurityOverlayImage").value("data:image/png;base64,impurity-overlay-1"))
                .andExpect(jsonPath("$.data[0].blackBackgroundImpurityOverlay")
                        .value("data:image/png;base64,black-impurity-overlay-1"));

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

    @Test
    void modelHttpErrorDoesNotCreateHistoryRecord() throws Exception {
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        server.expect(requestTo("http://127.0.0.1:5000/predict?images=0"))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":\"模型文件缺失\",\"detectionResult\":{\"colorGrade\":-1,\"impurityGrade\":-1,\"cottonArea\":0.0,\"impurityArea\":0,\"areaRatio\":0.0,\"confidence\":0.0}}"));

        User user = userRepository.save(new User("model_error_" + suffix(), "password"));
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "sample.jpg",
                MediaType.IMAGE_JPEG_VALUE,
                "image".getBytes(StandardCharsets.UTF_8));

        RecognitionResult result = recognitionService.recognize(file, false, user.getId());

        assertThat(result.getErrorMessage()).isEqualTo("模型文件缺失");
        assertThat(recordRepository.findByUserIdOrderByCreatedAtDesc(user.getId())).isEmpty();
        server.verify();
    }
    @Test
    void recognitionSavesAndReturnsNewModelImages() throws Exception {
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        server.expect(requestTo("http://127.0.0.1:5000/predict?images=1"))
                .andRespond(withStatus(HttpStatus.OK)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"cottonMaskImage\":\"data:image/png;base64,cotton-mask\"," +
                                "\"impurityMaskImage\":\"data:image/png;base64,impurity-mask\"," +
                                "\"cottonOverlayImage\":\"data:image/png;base64,cotton-overlay\"," +
                                "\"impurityOverlayImage\":\"data:image/png;base64,impurity-overlay\"," +
                                "\"blackBackgroundImpurityOverlay\":\"data:image/png;base64,black-impurity-overlay\"," +
                                "\"detectionResult\":{\"colorGrade\":3,\"impurityGrade\":2," +
                                "\"cottonArea\":81.5,\"impurityArea\":44,\"areaRatio\":0.012," +
                                "\"confidence\":0.96}}"));

        User user = userRepository.save(new User("model_success_" + suffix(), "password"));
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "sample.png",
                MediaType.IMAGE_PNG_VALUE,
                "image".getBytes(StandardCharsets.UTF_8));

        RecognitionResult result = recognitionService.recognize(file, true, user.getId());

        assertThat(result.getCottonMaskImage()).isEqualTo("data:image/png;base64,cotton-mask");
        assertThat(result.getImpurityMaskImage()).isEqualTo("data:image/png;base64,impurity-mask");
        assertThat(result.getCottonOverlayImage()).isEqualTo("data:image/png;base64,cotton-overlay");
        assertThat(result.getImpurityOverlayImage()).isEqualTo("data:image/png;base64,impurity-overlay");
        assertThat(result.getBlackBackgroundImpurityOverlay())
                .isEqualTo("data:image/png;base64,black-impurity-overlay");
        assertThat(result.getCottonAreaImage()).isNull();
        assertThat(result.getImpurityAreaImage()).isNull();
        assertThat(result.getConclusion()).isNull();
        assertThat(result.getLabel()).isEqualTo("3");
        assertThat(result.getConfidence()).isEqualTo(0.96f);

        RecognitionRecord record = recordRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).get(0);
        assertThat(record.getCottonMaskImage()).isEqualTo("data:image/png;base64,cotton-mask");
        assertThat(record.getImpurityMaskImage()).isEqualTo("data:image/png;base64,impurity-mask");
        assertThat(record.getCottonOverlayImage()).isEqualTo("data:image/png;base64,cotton-overlay");
        assertThat(record.getImpurityOverlayImage()).isEqualTo("data:image/png;base64,impurity-overlay");
        assertThat(record.getBlackBackgroundImpurityOverlay())
                .isEqualTo("data:image/png;base64,black-impurity-overlay");
        assertThat(record.getCottonAreaImage()).isNull();
        assertThat(record.getImpurityAreaImage()).isNull();
        assertThat(record.getConclusion()).isNull();

        RecognitionHistoryItem historyItem = recognitionService.getHistory(user.getId()).get(0);
        assertThat(historyItem.getCottonMaskImage()).isEqualTo("data:image/png;base64,cotton-mask");
        assertThat(historyItem.getImpurityMaskImage()).isEqualTo("data:image/png;base64,impurity-mask");
        assertThat(historyItem.getCottonOverlayImage()).isEqualTo("data:image/png;base64,cotton-overlay");
        assertThat(historyItem.getImpurityOverlayImage()).isEqualTo("data:image/png;base64,impurity-overlay");
        assertThat(historyItem.getBlackBackgroundImpurityOverlay())
                .isEqualTo("data:image/png;base64,black-impurity-overlay");
        assertThat(historyItem.getCottonAreaImage()).isNull();
        assertThat(historyItem.getImpurityAreaImage()).isNull();
        assertThat(historyItem.getConclusion()).isNull();
        server.verify();
    }

    @Test
    void uploadedStaticResourceIsServed() throws Exception {
        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(uploadPath);
        String fileName = "static-" + suffix() + ".txt";
        Files.writeString(uploadPath.resolve(fileName), "ok", StandardCharsets.UTF_8);

        mockMvc.perform(get("/uploads/" + fileName))
                .andExpect(status().isOk())
                .andExpect(content().string("ok"));
    }

    @Test
    void recognitionResultMapsPythonErrorField() throws Exception {
        RecognitionResult result = objectMapper.readValue(
                "{\"error\":\"模型文件缺失\",\"detectionResult\":{\"colorGrade\":-1}}",
                RecognitionResult.class);

        assertThat(result.getErrorMessage()).isEqualTo("模型文件缺失");
    }

    @Test
    void recognitionResultMapsNewImageFieldsAndAliases() throws Exception {
        RecognitionResult result = objectMapper.readValue(
                "{\"cotton_area_image\":\"snake-cotton-area\"," +
                        "\"impurity_area_image\":\"snake-impurity-area\"," +
                        "\"cottonMaskImage\":\"camel-cotton-mask\"," +
                        "\"impurity_mask_image\":\"snake-impurity-mask\"," +
                        "\"cotton_overlay_image\":\"snake-cotton-overlay\"," +
                        "\"impurityOverlayImage\":\"camel-impurity-overlay\"," +
                        "\"black_background_impurity_overlay\":\"snake-black-overlay\"," +
                        "\"detection_result\":{\"color_grade\":61,\"impurity_grade\":6," +
                        "\"cotton_area\":92.7,\"impurity_area\":42,\"area_ratio\":0.006," +
                        "\"confidence\":0.91}}",
                RecognitionResult.class);

        assertThat(result.getCottonAreaImage()).isEqualTo("snake-cotton-area");
        assertThat(result.getImpurityAreaImage()).isEqualTo("snake-impurity-area");
        assertThat(result.getCottonMaskImage()).isEqualTo("camel-cotton-mask");
        assertThat(result.getImpurityMaskImage()).isEqualTo("snake-impurity-mask");
        assertThat(result.getCottonOverlayImage()).isEqualTo("snake-cotton-overlay");
        assertThat(result.getImpurityOverlayImage()).isEqualTo("camel-impurity-overlay");
        assertThat(result.getBlackBackgroundImpurityOverlay()).isEqualTo("snake-black-overlay");
        assertThat(result.getDetectionResult().getColorGrade()).isEqualTo(61);
        assertThat(result.getDetectionResult().getImpurityGrade()).isEqualTo(6);
        assertThat(result.getDetectionResult().getCottonArea()).isEqualTo(92.7);
        assertThat(result.getDetectionResult().getImpurityArea()).isEqualTo(42);
        assertThat(result.getDetectionResult().getAreaRatio()).isEqualTo(0.006);
        assertThat(result.getDetectionResult().getConfidence()).isEqualTo(0.91);
    }


    private News news(String title, String imageUrl) {
        News news = new News();
        news.setTitle(title);
        news.setSummary("棉花海关资讯摘要");
        news.setContent("棉花海关资讯正文");
        news.setDate("2026-07-06");
        news.setSource("测试来源");
        news.setSourceUrl("https://example.com/news/" + title);
        news.setImageUrl(imageUrl);
        news.setCategory("测试资讯");
        news.setLanguage("zh");
        news.setKeywords("棉花,海关");
        return news;
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
        record.setCottonAreaImage("data:image/jpeg;base64,cotton-" + colorGrade);
        record.setImpurityAreaImage("data:image/png;base64,impurity-" + colorGrade);
        record.setCottonMaskImage("data:image/png;base64,cotton-mask-" + colorGrade);
        record.setImpurityMaskImage("data:image/png;base64,impurity-mask-" + colorGrade);
        record.setCottonOverlayImage("data:image/png;base64,cotton-overlay-" + colorGrade);
        record.setImpurityOverlayImage("data:image/png;base64,impurity-overlay-" + colorGrade);
        record.setBlackBackgroundImpurityOverlay(
                "data:image/png;base64,black-impurity-overlay-" + colorGrade);
        record.setColorGrade(colorGrade);
        record.setImpurityGrade(colorGrade);
        record.setCottonArea(72.5);
        record.setImpurityArea(12);
        record.setAreaRatio(0.03);
        record.setConfidence(0.91);
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

    private byte[] tinyPngBytes() {
        return Base64.getDecoder().decode(
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=");
    }

    private String suffix() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }
}
