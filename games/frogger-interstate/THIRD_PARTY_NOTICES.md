
# Third-Party Notices

This project includes CC0 assets downloaded from public sources for the frog/traffic visuals.

## Kenney - Racing Pack (CC0)

Source (asset page): https://kenney.nl/assets/racing-pack  
Download used: https://kenney.nl/media/pages/assets/racing-pack/b27a2ace7a-1677662443/kenney_racing-pack.zip  
License: Creative Commons CC0 1.0 Universal (attribution not required)

Assets used:
- `PNG/Tiles/Asphalt road/road_asphalt01.png` (road tile background)
- `PNG/Cars/car_red_1.png` (vehicle-car)
- `PNG/Cars/car_yellow_small_1.png` (vehicle-bus)
- `PNG/Cars/car_green_5.png` (vehicle-truck)

## OpenGameArt - Frog player spritesheets (CC0)

Source (asset page): https://opengameart.org/content/frog-player-spritesheets  
License: CC0 (attribution not required)

Assets used:
- `PlayerSprite0_3.png` — loaded as a **spritesheet** (256×128 → **8 frames** in a **4×2** grid of **64×64**) for the jump cycle
- `PlayerSprite1.png` — same layout; **frame 0** is used for idle / between jumps  
  (`PlayerSprite2.png` / `PlayerSprite3.png` are present in the pack but unused in this build)

## OpenGameArt - Woman RPG Character (CC0)

Source (asset page): https://opengameart.org/content/woman-rpg-character  
License: CC0 (attribution not required)

Note:
- `Mother Sprite Sheet.png` is downloaded in `public/assets`, but not used in runtime anymore.
- The current game renders a vector `mom-frog` texture procedurally in `BootScene` for visual consistency.
