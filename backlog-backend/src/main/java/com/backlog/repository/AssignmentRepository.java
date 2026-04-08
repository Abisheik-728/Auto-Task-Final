package com.backlog.repository;

import com.backlog.entity.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssignmentRepository extends JpaRepository<Assignment, Long> {
    List<Assignment> findByUserIdOrderByDeadlineAsc(Long userId);
    List<Assignment> findBySubject(String subject);
}
