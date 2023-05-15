/**
 * 
 */
var assetFolder = "projects/mapbiomas-workspace/AUXILIAR/ESTATISTICAS/COLECAO6";

var assets = [
    'country',
    'biome',
    'state',
    'city',
    'level_1_drainage_basin',
    'level_2_drainage_basin',
    'federal_conservation_units_integral_protection',
    'state_conservation_units_integral_protection',
    'federal_conservation_units_sustainable_use',
    'state_conservation_units_sustainable_use',
    'quilombo',
    'settlement',
    'legal_amazon',
    'atlantic_forest_law',
    'semiarid',
    'amacro',
    'matopiba',
    'biosphere_reserve',
    'level_1_basins_per_biome',
    'level_2_basins_per_biome',
    'quilombos_per_biome',
    'federal_conservation_units_integral_protection_per_biome',
    'federal_conservation_units_sustainable_use_per_biome',
    'state_conservation_units_integral_protection_per_biome',
    'state_conservation_units_sustainable_use_per_biome',
    'level_1_drainage_basin_pnrh',
    'level_2_drainage_basin_pnrh',
    'indigenous_land',
    'indigenous_lands_per_biome',
    'biomes_per_state',
    'level_1_basins_per_state',
    'level_2_basins_per_state',
    'level_1_drainage_basin_pnrh_per_state',
    'level_2_drainage_basin_pnrh_per_state',
    'level_1_drainage_basin_pnrh_per_biome',
    'level_2_drainage_basin_pnrh_per_biome',
    'level_1_basins_per_biome_per_state',
    'level_2_basins_per_biome_per_state',
    'indigenous_lands_per_state',
    'indigenous_lands_per_biome_per_state',
    'federal_conservation_units_integral_protection_per_state',
    'federal_conservation_units_integral_protection_per_state_per_biome',
    'federal_conservation_units_sustainable_use_per_state',
    'federal_conservation_units_sustainable_use_per_state_per_biome',
    'state_conservation_units_integral_protection_per_state',
    'state_conservation_units_integral_protection_per_state_per_biome',
    'state_conservation_units_sustainable_use_per_state',
    'state_conservation_units_sustainable_use_per_state_per_biome',
    'quilombos_per_state',
    'quilombos_per_biome_per_state',
    'settlements_per_state',
    'atlantic_forest_law_per_state',
    'atlantic_forest_law_per_city',
    'biomes_per_city',
];

var region = ee.Geometry.Polygon(
    [
        [
            [-74.89726562500002, 7.912024007342442],
            [-74.89726562500002, -34.79152285156706],
            [-33.06132812500001, -34.79152285156706],
            [-33.06132812500001, 7.912024007342442]
        ]
    ],
    null, false
);

assets.forEach(
    function (assetid) {

        var vector = ee.FeatureCollection(assetFolder + '/' + assetid);

        var raster = ee.Image().uint32().paint({
            'featureCollection': vector,
            'color': 'feature_id'
        });

        raster = raster.rename('territory_id');

        Map.addLayer(raster.randomVisualizer(), {}, assetid);

        Export.image.toAsset({
            'image': raster,
            'description': assetid,
            'assetId': assetFolder + '/' + assetid + '-raster',
            'pyramidingPolicy': { '.default': 'mode' },
            'region': region,
            'scale': 30,
            'maxPixels': 1e13
        });

    }
);
