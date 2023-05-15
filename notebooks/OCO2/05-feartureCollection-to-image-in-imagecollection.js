
var year = 2021

var assets = ee.data.listAssets('projects/mapbiomas-workspace/AR/XCO2_VECTORS/OCO2_'+year)
  .assets;

print(assets)
var recipe = ee.FeatureCollection([]);

assets = assets
  .filter(function(item){
    return item.name.split('-')[4] === ''+year;
  }).sort()
  .forEach(function(asset){
    var fc = ee.FeatureCollection(asset.name)
      .filter(ee.Filter.lte('area',0.00000001))
      .map(function(feature){
        return feature.set({
          'month':feature.getString('time').split('-').get(1),
          'year':feature.getString('time').split('-').get(0),
          // 'system:end':ee.Date(feature.getString('time').split(' ').get(0)),
        });
      });
    // print(fc.limit(2));
    // Map.addLayer(fc,{},asset.name.split('/')[7],false);
    recipe = recipe.merge(fc);
  })
  
  print(recipe.limit(4));
  
  var months = [
    1,2,3,4,5,6,7
    // ,8,9,10,11,12
  ];
  
  var years = [
    year
  ];

months.forEach(function(month){
    print(st)
    var st = ''+year+'-'+month+'-01';
    var ed = ''+year+'-'+(month+1)+'-01';
    
    if(month === 12){
     ed = ''+(year+1)+'-01-01';
    }
    var month_str = ''+month;
    if(month_str< 10){
      month_str = '0'+month;
    }
    
    var version = 'v1';
    var index = ''+year+'-'+month_str+'-'+version;
    
    var fc = recipe
      .filter(ee.Filter.eq('month',month_str))
      .filter(ee.Filter.eq('year',''+year));
      
      
    var image = fc.reduceToImage(['xco2'],ee.Reducer.mean())
      .set({
        index: index,
        version:version,
        year:year,
        month:month,
        'system:time_start':ee.Date(st).millis().getInfo(),
        'system:time_end':ee.Date(ed).millis().getInfo(),
        unit:'co2-ppm',
        aggregate_type:'monthly mean'
      });
    // Map.addLayer(fc,{},month_str + '---' + st,false);
    // Map.addLayer(image.randomVisualizer(),{},st,false);
    print(st,image,fc.limit(2),fc.size())
    var description = index;
    var assetId = 'projects/mapbiomas-workspace/AR/XCO2/';
    
    Map.addLayer(image,{},index,false);
    
    Export.image.toAsset({
      image:image, 
      description:index,
      assetId:assetId + index, 
      // pyramidingPolicy:,
      // dimensions:,
      region:geometry,
      scale:1000,
      // crs:, 
      // crsTransform:,
      maxPixels:1e13,
      // shardSize:
    });
    
    });

  
  // });
  
print(assets);
