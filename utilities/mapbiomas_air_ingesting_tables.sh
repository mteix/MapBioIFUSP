#!/bin/bash
set -o errexit 

gee_folder="projects/mapbiomas-workspace/AUXILIAR/ESTATISTICAS/COLECAO6"
folder="/home/joao/Documentos/Trabalho/mapbiomas/brasil/COLECAO6/SHAPES/PROCESSADOS"
uri="gs://shared-development-storage/COLECOES/BRASIL/COLECAO6/SHAPES-ESTATISTICAS/VERSAO-2"

file_list=(
    # 'country'
    # 'biome'
    # 'state'
    # 'city'
    # 'level_1_drainage_basin'
    # 'level_2_drainage_basin'
    # 'federal_conservation_units_integral_protection'
    # 'state_conservation_units_integral_protection'
    # 'federal_conservation_units_sustainable_use'
    # 'state_conservation_units_sustainable_use'
    # 'quilombo'
    # 'settlement'
    # 'legal_amazon'
    # 'atlantic_forest_law'
    # 'semiarid'
    # 'amacro'
    # 'matopiba'
    # 'biosphere_reserve'
    # 'level_1_basins_per_biome'
    # 'level_2_basins_per_biome'
    # 'quilombos_per_biome'
    # 'federal_conservation_units_integral_protection_per_biome'
    # 'federal_conservation_units_sustainable_use_per_biome'
    # 'state_conservation_units_integral_protection_per_biome'
    # 'state_conservation_units_sustainable_use_per_biome'
    # 'level_1_drainage_basin_pnrh'
    # 'level_2_drainage_basin_pnrh'
    # 'biomes_per_state'
    # 'level_1_basins_per_state'
    # 'level_2_basins_per_state'
    # 'level_1_drainage_basin_pnrh_per_state'
    # 'level_2_drainage_basin_pnrh_per_state'
    # 'level_1_drainage_basin_pnrh_per_biome'
    # 'level_2_drainage_basin_pnrh_per_biome'
    # 'level_1_basins_per_biome_per_state'
    # 'level_2_basins_per_biome_per_state'
    # 'federal_conservation_units_integral_protection_per_state'
    # 'federal_conservation_units_integral_protection_per_state_per_biome'
    # 'federal_conservation_units_sustainable_use_per_state'
    # 'federal_conservation_units_sustainable_use_per_state_per_biome'
    # 'state_conservation_units_integral_protection_per_state'
    # 'state_conservation_units_integral_protection_per_state_per_biome'
    # 'state_conservation_units_sustainable_use_per_state'
    # 'state_conservation_units_sustainable_use_per_state_per_biome'
    # 'quilombos_per_state'
    # 'quilombos_per_biome_per_state'
    # 'settlements_per_state'
    # 'atlantic_forest_law_per_state'
    # 'atlantic_forest_law_per_city'
    # 'biomes_per_city'
    'indigenous_land_new'
    'indigenous_lands_per_biome_new'
    'indigenous_lands_per_state_new'
    'indigenous_lands_per_biome_per_state_new'
)

cd "${folder}"

ls -l

for file in ${file_list[@]}
do
    echo "${file}.shp"
    echo "${file}.gpkg"

    ogr2ogr \
        -f "ESRI Shapefile" \
        "${file}.shp" \
        "${file}.gpkg" 
    
    zip \
        "${file}.zip" \
        "${file}.shp" "${file}.dbf" "${file}.shx" "${file}.prj"
    
    rm "${file}.shp" "${file}.dbf" "${file}.shx" "${file}.prj"
    
    gsutil \
        -m \
        cp -v "${file}.zip" \
        "${uri}"

    # gsutil \
    #     -m \
    #     cp -v "${file}.gpkg" \
    #     "${uri}"
    
    echo "ingesting ${file} ..."

    earthengine \
        upload table \
        --asset_id "${gee_folder}/${file}" \
        "${uri}/${file}.zip"
done

exit 0