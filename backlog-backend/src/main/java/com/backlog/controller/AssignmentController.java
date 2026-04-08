package com.backlog.controller;

import com.backlog.entity.Assignment;
import com.backlog.service.AssignmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/assignments")
@RequiredArgsConstructor
public class AssignmentController {

    private final AssignmentService assignmentService;

    @GetMapping
    public ResponseEntity<List<Assignment>> getAll() {
        return ResponseEntity.ok(assignmentService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Assignment> getById(@PathVariable Long id) {
        return ResponseEntity.ok(assignmentService.getById(id));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Assignment>> getByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(assignmentService.getByUserId(userId));
    }

    @PostMapping
    public ResponseEntity<Assignment> create(@Valid @RequestBody Assignment assignment) {
        return ResponseEntity.status(HttpStatus.CREATED).body(assignmentService.create(assignment));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Assignment> update(@PathVariable Long id, @RequestBody Assignment updates) {
        return ResponseEntity.ok(assignmentService.update(id, updates));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        assignmentService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
