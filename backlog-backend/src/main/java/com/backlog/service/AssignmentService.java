package com.backlog.service;

import com.backlog.entity.Assignment;
import com.backlog.repository.AssignmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AssignmentService {

    private final AssignmentRepository assignmentRepository;

    public List<Assignment> getAll() {
        return assignmentRepository.findAll();
    }

    public List<Assignment> getByUserId(Long userId) {
        return assignmentRepository.findByUserIdOrderByDeadlineAsc(userId);
    }

    public Assignment getById(Long id) {
        return assignmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Assignment not found with id: " + id));
    }

    public Assignment create(Assignment assignment) {
        return assignmentRepository.save(assignment);
    }

    public Assignment update(Long id, Assignment updates) {
        Assignment existing = getById(id);
        if (updates.getTitle() != null) existing.setTitle(updates.getTitle());
        if (updates.getSubject() != null) existing.setSubject(updates.getSubject());
        if (updates.getDeadline() != null) existing.setDeadline(updates.getDeadline());
        if (updates.getDescription() != null) existing.setDescription(updates.getDescription());
        return assignmentRepository.save(existing);
    }

    public void delete(Long id) {
        if (!assignmentRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Assignment not found with id: " + id);
        }
        assignmentRepository.deleteById(id);
    }
}
