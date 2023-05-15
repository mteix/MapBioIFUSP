var assets = ee.data.listAssets('projects/mapbiomas-workspace/AR/CH4_VECTORS').assets;
var output_path = 'projects/mapbiomas-workspace/AR/XCH4_MERGED_MIPS/';


assets
// .slice(0,10)
.forEach(function(asset){
  var feature = ee.FeatureCollection(asset.id);
  
  var shortName = asset.id.split('xch4_merged_mips')[1];
  
  var year = ee.Number.parse(shortName.split('_')[0]);
  var monthString = shortName.split('_')[1]; 
  var  month = ee.Number.parse(monthString);
  
  var start = ee.String(year).cat('-').cat(month).cat('-01');
  var end;
    
  if (monthString !== '12'){
    end = ee.String(year).cat('-').cat(month.add(1)).cat('-01');
  } else {
    end = ee.String(year.add(1)).cat('-01-01');
  }

  
  var zeros_month = {
    1:'0'+monthString,
    2:''+monthString,
  };
  
  ee.String(year).cat('_').cat(zeros_month[monthString.length])
    .evaluate(function(description){
      
  
      var image = ee.Image().paint(feature,'xch4').rename('xch4')
        .set({
          month:month,
          year:year,
          index:description,
          unit:'xch4',
          originalName:'xch4_merged_mips'+shortName,
          'system:time_start':ee.Date(start).millis(),
          'system:time_end':ee.Date(end).millis()
          });
      
      Export.image.toAsset({
        image:image,
        description:'xch4-'+description,
        assetId:output_path+description,
        pyramidingPolicy:'mean',
        // dimensions:,
        region:feature.geometry().bounds(),
        scale:500,
        // crs:,
        // crsTransform:,
        maxPixels:1e13,
        // shardSize
        });
      
        print(description,year,month,start,end,image);
    });

});
