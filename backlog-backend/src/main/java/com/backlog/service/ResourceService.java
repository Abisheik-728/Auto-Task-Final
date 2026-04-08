package com.backlog.service;

import com.backlog.entity.Resource;
import com.backlog.repository.ResourceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ResourceService {

    private final ResourceRepository resourceRepository;

    public List<Resource> getAll() {
        return resourceRepository.findAll();
    }

    public List<Resource> getBySubject(String subject) {
        return resourceRepository.findBySubject(subject);
    }

    public List<Resource> getByUploader(Long userId) {
        return resourceRepository.findByUploadedByIdOrderByCreatedAtDesc(userId);
    }

    public Resource getById(Long id) {
        return resourceRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Resource not found with id: " + id));
    }

    public Resource create(Resource resource) {
        return resourceRepository.save(resource);
    }

    public void delete(Long id) {
        if (!resourceRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Resource not found with id: " + id);
        }
        resourceRepository.deleteById(id);
    }
}
