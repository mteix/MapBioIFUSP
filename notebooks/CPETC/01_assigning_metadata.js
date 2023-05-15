ee.data.listAssets('projects/mapbiomas-workspace/AR/CPETC').assets
  .forEach(function(asset){
    
    var date = asset.id.split('/')[4];
    var year = date.split('_')[0];
    var month = date.split('_')[1];
    
    var start = '' + year + '-' + month + '-01';
    var end;
    
    if (month !== '12'){
      end = ee.String('' + year + '-').cat(ee.Number.parse(month).add(1)).cat('-01');
    } else {
      end = ee.String(ee.Number.parse(year).add(1)).cat('-01-01');
    }
    
    start = ee.Date(start).millis();
    end = ee.Date(end).millis();
    
    var props = {
      'system:time_start':start.getInfo(),
      'system:time_end':end.getInfo(),
      'index':date,
      'year':ee.Number.parse(year).getInfo(),
      'month':ee.Number.parse(month).getInfo(),
      'originalName':'CPTEC/'+date,
    };
    
    ee.data.setAssetProperties(asset.id,props);
    
    print(props,asset,date,start,end);
  }); 
