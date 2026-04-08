package com.backlog.repository;

import com.backlog.entity.Resource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ResourceRepository extends JpaRepository<Resource, Long> {
    List<Resource> findBySubject(String subject);
    List<Resource> findByUploadedByIdOrderByCreatedAtDesc(Long userId);
}
