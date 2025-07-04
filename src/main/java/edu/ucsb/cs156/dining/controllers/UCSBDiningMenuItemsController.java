package edu.ucsb.cs156.dining.controllers;

import edu.ucsb.cs156.dining.services.UCSBDiningMenuItemsService;
import edu.ucsb.cs156.dining.models.Entree;
import edu.ucsb.cs156.dining.entities.MenuItem;
import edu.ucsb.cs156.dining.repositories.MenuItemRepository;
import edu.ucsb.cs156.dining.repositories.ReviewRepository;

import java.util.Optional;
import java.util.stream.Collectors;
import java.util.ArrayList;

import edu.ucsb.cs156.dining.errors.EntityNotFoundException;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

import jakarta.validation.Valid;

@Tag(name = "UCSBDiningMenuItems")
@RestController
@RequestMapping("/api/diningcommons")
@Slf4j
public class UCSBDiningMenuItemsController extends ApiController {

  @Autowired 
  UCSBDiningMenuItemsService ucsbDiningMenuItemsService;
  
  @Autowired
  MenuItemRepository menuItemRepository;

  @Autowired
  ReviewRepository reviewRepository;

  @Operation(summary = "Get list of entrees being served at given meal, dining common, and day, with average rating")
  @GetMapping(value = "/{date-time}/{dining-commons-code}/{meal-code}", produces = "application/json")
  public ResponseEntity<List<MenuItemWithAvg>> get_menu_items(
      @Parameter(description= "date (in iso format, e.g. YYYY-mm-dd) or date-time (in iso format e.g. YYYY-mm-ddTHH:MM:SS)") 
      @PathVariable("date-time") String datetime,
      @PathVariable("dining-commons-code") String diningcommoncode,
      @PathVariable("meal-code") String mealcode
  )
    throws Exception {

    List<Entree> body = ucsbDiningMenuItemsService.get(datetime, diningcommoncode, mealcode);

    List<MenuItem> menuItems = new ArrayList<>();

    for (Entree entree : body) {
        Optional<MenuItem> exists = menuItemRepository.findByDiningCommonsCodeAndMealCodeAndNameAndStation(diningcommoncode, mealcode, entree.getName(), entree.getStation());

        MenuItem newMenuItem = exists.orElse(new MenuItem());
          newMenuItem.setDiningCommonsCode(diningcommoncode);
          newMenuItem.setMealCode(mealcode);
          newMenuItem.setName(entree.getName());
          newMenuItem.setStation(entree.getStation());

          menuItemRepository.save(newMenuItem);
          menuItems.add(newMenuItem);
    }
    
    List<MenuItemWithAvg> withAvgs = buildMenuItemWithAvgList(menuItems);

    return ResponseEntity.ok().body(withAvgs);
  }

  private List<MenuItemWithAvg> buildMenuItemWithAvgList(List<MenuItem> items) {
    return items.stream().map(item -> {
        Double avg = reviewRepository.findAverageScoreByItemId(item.getId()).orElse(null);
        return new MenuItemWithAvg(item.getId(), item.getDiningCommonsCode(), item.getMealCode(), item.getName(), item.getStation(), avg);
      }).collect(Collectors.toList());
  }

  

  @Operation(summary = "Get a single menu item by id")
  @GetMapping(value = "/menuitem", produces = "application/json")
  public ResponseEntity<MenuItem> get_menu_item(
      @Parameter(description= "id of the menu item") 
      @RequestParam Long id
  )
    throws Exception {

      MenuItem menuItem = menuItemRepository.findById(id)
          .orElseThrow(() -> new EntityNotFoundException(MenuItem.class, id));

      return ResponseEntity.ok().body(menuItem);
      
    }
}

class MenuItemWithAvg {
    private Long id;
    private String diningCommonsCode;
    private String mealCode;
    private String name;
    private String station;
    private Double averageRating;

    public MenuItemWithAvg(Long id, String diningCommonsCode, String mealCode, String name, String station, Double averageRating) {
        this.id = id;
        this.diningCommonsCode = diningCommonsCode;
        this.mealCode = mealCode;
        this.name = name;
        this.station = station;
        this.averageRating = averageRating;
    }

    public Long getId() { return id; }
    public String getDiningCommonsCode() { return diningCommonsCode; }
    public String getMealCode(){ return mealCode; }
    public String getName() { return name; }
    public String getStation() { return station; }
    public Double getAverageRating() { return averageRating; }
  }