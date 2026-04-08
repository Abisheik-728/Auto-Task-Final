package com.backlog.controller;

import com.backlog.entity.Resource;
import com.backlog.service.ResourceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/resources")
@RequiredArgsConstructor
public class ResourceController {

    private final ResourceService resourceService;

    @GetMapping
    public ResponseEntity<List<Resource>> getAll() {
        return ResponseEntity.ok(resourceService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Resource> getById(@PathVariable Long id) {
        return ResponseEntity.ok(resourceService.getById(id));
    }

    @GetMapping("/subject/{subject}")
    public ResponseEntity<List<Resource>> getBySubject(@PathVariable String subject) {
        return ResponseEntity.ok(resourceService.getBySubject(subject));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Resource>> getByUploader(@PathVariable Long userId) {
        return ResponseEntity.ok(resourceService.getByUploader(userId));
    }

    @PostMapping
    public ResponseEntity<Resource> upload(@Valid @RequestBody Resource resource) {
        return ResponseEntity.status(HttpStatus.CREATED).body(resourceService.create(resource));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        resourceService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
