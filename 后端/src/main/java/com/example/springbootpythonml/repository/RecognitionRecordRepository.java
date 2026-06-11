package com.example.springbootpythonml.repository;

import com.example.springbootpythonml.entity.RecognitionRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecognitionRecordRepository extends JpaRepository<RecognitionRecord, Long> {
    List<RecognitionRecord> findByUserIdOrderByCreatedAtDesc(Long userId);
}
