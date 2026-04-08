package com.backlog.repository;

import com.backlog.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Task> findByStatus(Task.Status status);
    List<Task> findByUserIdAndStatus(Long userId, Task.Status status);
}
