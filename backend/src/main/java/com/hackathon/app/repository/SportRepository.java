package com.hackathon.app.repository;

import java.util.List;

import com.hackathon.app.entity.Sport;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SportRepository extends JpaRepository<Sport, Long> {

	List<Sport> findAllByOrderByNameAsc();
}
