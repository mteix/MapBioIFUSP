// GLOBALS
var selectors = {
  selectedYear: new Date().getFullYear(),
  selectedMonth: new Date().getMonth() + 1,
  filterDate: '1-1',
  selectedState: "Brasil",
  aggregateByYear: false,
  selectedBasin: '',
  roiType: 'state',
  showCharts: false,
  shouldReduce: true,
  aggregationType: 'monthly',
  aggregationPeriod: 'year',
  selectedReducer: 'mean'
};

var styles = {
  common: { margin: '0px' },
  mainPanel: { minWidth: '250px' },
  title: { fontSize: '22px' },
  subtitle: {
    fontSize: '12px',
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'cccccc',
    stretch: 'horizontal',
    maxWidth: '90%'
  },
  layerSelector: {
    padding: '10px',
  }
};
var opt = {};
var selectedBands = {};
var layers = [];
var basinFeature = null;
var biomeFeature = null;
var drawingFeature = null;
var charts = [];
var currentCollections = [];
var lastFeatureApplied = ee.FeatureCollection('');
var validCollections = ['AEROSOL', 'AIRS_CO', 'CO2_MIPS', 'OCO2', 'OZONE', 'XCH4_MERGED_PIPS'];

// ASSETS
var datasets = ee.data.listAssets('projects/mapbiomas-workspace/AR')
  .assets
  .filter(function (obj) { return obj.type === 'IMAGE_COLLECTION' && validCollections.indexOf(nameFromId(obj.name)) !== -1 })
  .map(function (el) {
    return { 'type': el.type, 'name': nameFromId(el.name), 'group': 'MapBiomas-Ar', 'id': el.name, 'label': labelFromId(el.name) };
  });

datasets.push({ 'type': 'IMAGE_COLLECTION', 'name': 'IMERG_MONTHLY_V06', 'label':'Precipitação', 'group': 'MapBiomas-Ar', 'id': 'NASA/GPM_L3/IMERG_MONTHLY_V06' });
datasets.push({ 'type': 'IMAGE_COLLECTION', 'name': 'MONTHLY', 'label':'Temperatura', 'group': 'MapBiomas-Ar', 'id': 'ECMWF/ERA5/MONTHLY' });

var basins = [
  {
    'label': 'level_1_drainage_basin',
    'value': 'projects/mapbiomas-workspace/AUXILIAR/ESTATISTICAS/COLECAO7/level_1_drainage_basin',
  },
  {
    'label': 'level_1_drainage_basin_pnrh',
    'value': 'projects/mapbiomas-workspace/AUXILIAR/ESTATISTICAS/COLECAO7/level_1_drainage_basin_pnrh',
  },
  {
    'label': 'level_2_drainage_basin',
    'value': 'projects/mapbiomas-workspace/AUXILIAR/ESTATISTICAS/COLECAO7/level_2_drainage_basin',
  },
  {
    'label': 'level_2_drainage_basin_pnrh',
    'value': 'projects/mapbiomas-workspace/AUXILIAR/ESTATISTICAS/COLECAO7/level_2_drainage_basin_pnrh',
  },
];
var biomeDataset = {
  'label': 'biome',
  'value': 'projects/mapbiomas-workspace/AUXILIAR/ESTATISTICAS/COLECAO7/biome',
};
var legalAmazonDataset = {
  'label': 'legal_amazon',
  'value': 'projects/mapbiomas-workspace/AUXILIAR/ESTATISTICAS/COLECAO7/legal_amazon',
};

var statesBrasil = ee.FeatureCollection('projects/mapbiomas-workspace/AUXILIAR/ESTATISTICAS/COLECAO7/state');
var federation = ee.FeatureCollection('projects/mapbiomas-workspace/AUXILIAR/ESTATISTICAS/COLECAO7/country');
statesBrasil.merge(federation)

var landcover = ee.Image('projects/mapbiomas-workspace/public/collection7_1/mapbiomas_collection71_integration_v1');

var reducers = [
  { label: "Média", value: 'mean' },
  { label: "Soma", value: 'sum' },
  { label: "Mínimo", value: 'min' },
  { label: "Máximo", value: 'max' },
  { label: "Mediana", value: 'median' },
  { label: "Desvio Padrão", value: 'stdDev' },
  { label: "Variância", value: 'variance' },
  { label: "Moda", value: 'mode' },
];

var reducersMap = [
  { id: 'mean', reducer: ee.Reducer.mean() },
  { id: 'sum', reducer: ee.Reducer.sum() },
  { id: 'min', reducer: ee.Reducer.min() },
  { id: 'max', reducer: ee.Reducer.max() },
  { id: 'median', reducer: ee.Reducer.median() },
  { id: 'stdDev', reducer: ee.Reducer.stdDev() },
  { id: 'variance', reducer: ee.Reducer.variance() },
  { id: 'mode', reducer: ee.Reducer.mode() },
];

// UI METHODS
function setLayout() {
  opt.panel = ui.Panel({
    widgets: [],
    style: styles.mainPanel
  });
  ui.root.add(opt.panel);

  var displayCharts = ui.Checkbox({
    label: 'Exibir séries temporais',
    style: { fontWeight: 'bold' },
    onChange: function (event) {
      selectors.showCharts = event;
      if (event) {
        updateCharts();
        chartAggregationTypePlaceholder.add(opt.chartAggregationType)
        chartAggregationPeriodPlaceholder.add(opt.chartAggregationPeriod)
        opt.reducerPanelPlaceholder.add(opt.reducerPanel);
      }
      else {
        chartAggregationTypePlaceholder.remove(opt.chartAggregationType)
        chartAggregationPeriodPlaceholder.remove(opt.chartAggregationPeriod)
        opt.reducerPanelPlaceholder.remove(opt.reducerPanel);
        opt.chartPanel.clear();
        opt.chartPanel.style().set('shown', false);
      }
    }
  });
  
  var chartAggregationTypeSelector = ui.Select({
    items: [{label: 'Mensal', value: 'monthly'}, {label: 'Anual', value: 'yearly'}],
    value: 'monthly',
    onChange: function (key) {
      selectors.aggregationType = key;
      updateCharts();
      if(key === 'yearly'){
        chartAggregationPeriodPlaceholder.remove(opt.chartAggregationPeriod)
      }
      else{
        chartAggregationPeriodPlaceholder.add(opt.chartAggregationPeriod)
      }
    },
    style: {margin: '5px'},
  })
  var chartAggregationLabel = ui.Label('Tipo de agregação do gráfico', {maxWidth:'180px'});
  opt.chartAggregationType = ui.Panel({
    widgets: [chartAggregationLabel, chartAggregationTypeSelector],
    layout: ui.Panel.Layout.Flow('horizontal'),
  });
  var chartAggregationTypePlaceholder = ui.Panel()


  var chartAggregationPeriodSelector = ui.Select({
    items: [{label: 'Dados do ano selecionado', value: 'year'}, {label: 'Dados de todo dataset', value: 'total'}],
    value: 'year',
    onChange: function (key) {
      selectors.aggregationPeriod = key;
      updateCharts();
    },
    style: {margin: '5px'},
  })
  var chartAggregationPeriodLabel = ui.Label('Periodo de dados do gráfico', {maxWidth:'180px'});
  opt.chartAggregationPeriod = ui.Panel({
    widgets: [chartAggregationPeriodLabel, chartAggregationPeriodSelector],
    layout: ui.Panel.Layout.Flow('horizontal'),
  });
  var chartAggregationPeriodPlaceholder = ui.Panel()

  var reducerSelector = ui.Select({
    items: reducers,
    style: { margin: '5px'},
    value: 'mean',
    onChange: function (selectedReducer) {
      selectors.selectedReducer = selectedReducer;
      updateLayers();
    }
  });
  var reducerLabel = ui.Label('Escolha o dado desejado', {maxWidth:'180px'});
  opt.reducerPanel = ui.Panel({
    widgets: [reducerLabel, reducerSelector],
    layout: ui.Panel.Layout.Flow('horizontal'),
  });
  opt.reducerPanelPlaceholder = ui.Panel();


  var adjustCollectionCheckBox = ui.Checkbox({
    label: 'Exagerar valores para aumentar contraste',
    style: { fontWeight: 'bold', width: '210px' },
    value: true,
    onChange: function (event) {
      selectors.shouldReduce = event;
      updateLayers();
      }
  });

  var exportTiff = ui.Button({
    label: 'Exportar GeoTIFF',
    style: { fontWeight: 'bold' },
    onClick: function () {
      exportRoutine()
    }
  });
  
  opt.chartPanel = ui.Panel({
    style: { position: 'bottom-right' },
  });
  opt.chartPanel.style().set('shown', false);
  Map.add(opt.chartPanel);

  var title = ui.Label('Toolkit Atmosfera', styles.title);
  opt.panel.add(title);

  opt.panel.add(displayCharts);
  opt.panel.add(chartAggregationTypePlaceholder);
  opt.panel.add(chartAggregationPeriodPlaceholder);
  opt.panel.add(opt.reducerPanelPlaceholder);
  opt.panel.add(exportTiff);

  var subtitle = ui.Label('Período de visualização', styles.subtitle);
  opt.panel.add(subtitle);

  addSlidersAndAggregationByYearCheckbox();

  var regionSubtitle = ui.Label('Região de interesse', styles.subtitle);
  opt.panel.add(regionSubtitle);

  addInterestRegionSelector();
  addStateSelector();
  addBasinSelector();

  var layerSubtitle = ui.Label('Camadas', styles.subtitle);
  opt.panel.add(layerSubtitle);

  addDatasetSelector();

  opt.panel.add(adjustCollectionCheckBox);

  var bandsSubtitle = ui.Label('Bandas', styles.subtitle);
  opt.panel.add(bandsSubtitle);

  opt.bandsSelectorUi = ui.Panel({ style: styles.common });
  opt.panel.add(opt.bandsSelectorUi);

  opt.bandsPlaceholder = {};
}

function addAggregationByYear() {
  var aggregateByYearCheckbox = ui.Checkbox({
    label: 'Usar filtro mensal (ativo, muda o periodo de agregação de 12 meses para 1 mês)',
    style: { maxWidth: '210px'},
    value: true,
    })

  aggregateByYearCheckbox.onChange(function (checked) {
    if (!checked) {
      selectors.aggregateByYear = true;
      opt.monthPanelPlaceholder.remove(opt.monthPanel);
    }
    else {
      selectors.aggregateByYear = false;
      opt.monthPanelPlaceholder.add(opt.monthPanel);
    }
    updateLayers();
  });

  opt.panel.add(aggregateByYearCheckbox);
}

function addSlidersAndAggregationByYearCheckbox() {
  initializeYearSlider();
  addAggregationByYear();
  initializeMonthSlider();
}

function initializeYearSlider() {
  var slider = ui.Slider();
  slider.style().set({
    stretch: 'horizontal'
  });

  var label = ui.Label('Selecione o ano para visualização:');
  label.style().set('position', 'top-left');

  slider.setStep(1);
  slider.setMax(selectors.selectedYear);
  slider.setMin(1986);
  slider.setValue(selectors.selectedYear);
  slider.onChange(function (value) {
    selectors.selectedYear = value;
    selectors.filterDate = selectors.selectedYear + "-" + selectors.selectedMonth;
    updateLayers();
  });

  opt.panel.add(label);
  opt.panel.add(slider);
}

function initializeMonthSlider() {
  var label = ui.Label({value:'Selecione o mês para visualização:', style:{'maxWidth': '210px'}});
  var slider = ui.Slider();

  slider.style().set({
    stretch: 'horizontal'
  });
  slider.setStep(1);
  slider.setMax(12);
  slider.setMin(1);
  slider.setValue(selectors.selectedMonth);
  slider.onChange(function (value) {
    if (selectors.aggregateByYear) return;
    selectors.selectedMonth = value;
    selectors.filterDate = selectors.selectedYear + "-" + selectors.selectedMonth;
    updateLayers();
  });
  opt.monthPanelPlaceholder = ui.Panel();
  opt.monthPanel = ui.Panel({
    widgets: [label, slider],
    layout: ui.Panel.Layout.Flow('vertical')
  });
  opt.monthPanelPlaceholder.add(opt.monthPanel);
  opt.panel.add(opt.monthPanelPlaceholder);
}

function addInterestRegionSelector() {
  var regions = [
    { label: "Estados/união", value: "state" },
    { label: "Bacias", value: "basin" },
    { label: "Biomas", value: "biome" },
    { label: "Amazônia legal", value: "amazon" },
    { label: "Seleção manual", value: "manual" },
  ];

  var select = ui.Select({
    items: regions,
    style: { 'minWidth': '210px' },
    placeholder: "Selecionar Região",
    value: "state",
    onChange: function (key) {
      opt.statesPanelPlaceholder.remove(opt.basinSelector);
      opt.statesPanelPlaceholder.remove(opt.stateSelector);
      if (key == "state") opt.statesPanelPlaceholder.add(opt.stateSelector);
      if (key == "basin") opt.statesPanelPlaceholder.add(opt.basinSelector);
      selectors.roiType = key;
      basinFeature = null;
      biomeFeature = null;
      drawingFeature = null;
      lastFeatureApplied = ee.FeatureCollection('');
      updateLayers();
    }
  });
  opt.panel.add(select);
}

function addBasinSelector() {
  opt.basinSelector = ui.Select({
    items: basins,
    style: { 'minWidth': '210px' },
    placeholder: "Selecionar Bacia",
    onChange: function (key) {
      selectors.selectedBasin = key;
      basinFeature = null;
      biomeFeature = null;
      updateLayers();
    }
  });
}

function addStateSelector() {
  var states = [
    { label: "Brasil", value: "Brasil" },
    { label: "Acre", value: "Acre" },
    { label: "Alagoas", value: "Alagoas" },
    { label: "Amapá", value: "Amap�" },
    { label: "Amazonas", value: "Amazonas" },
    { label: "Bahia", value: "Bahia" },
    { label: "Ceará", value: "Cear�" },
    { label: "Distrito Federal", value: "Distrito Federal" },
    { label: "Espírito Santo", value: "Esp�rito Santo" },
    { label: "Goiás", value: "Goi�s" },
    { label: "Maranhão", value: "Maranh�o" },
    { label: "Mato Grosso", value: "Mato Grosso" },
    { label: "Mato Grosso do Sul", value: "Mato Grosso do Sul" },
    { label: "Minas Gerais", value: "Minas Gerais" },
    { label: "Pará", value: "Par�" },
    { label: "Paraíba", value: "Para�ba" },
    { label: "Paraná", value: "Paran�" },
    { label: "Pernambuco", value: "Pernambuco" },
    { label: "Piauí", value: "Piau�" },
    { label: "Rio de Janeiro", value: "Rio de Janeiro" },
    { label: "Rio Grande do Norte", value: "Rio Grande do Norte" },
    { label: "Rio Grande do Sul", value: "Rio Grande do Sul" },
    { label: "Rondônia", value: "Rond�nia" },
    { label: "Roraima", value: "Roraima" },
    { label: "Santa Catarina", value: "Santa Catarina" },
    { label: "São Paulo", value: "S�o Paulo" },
    { label: "Sergipe", value: "Sergipe" },
    { label: "Tocantins", value: "Tocantins" }
  ];

  opt.stateSelector = ui.Select({
    items: states,
    style: { 'minWidth': '210px' },
    value: "Brasil",
    onChange: function (key) {
      selectors.selectedState = key;
      updateLayers();
    }
  });

  opt.statesPanelPlaceholder = ui.Panel();
  opt.statesPanelPlaceholder.add(opt.stateSelector);
  opt.panel.add(opt.statesPanelPlaceholder);
}

function addDatasetSelector() {
  var body = ui.Panel({ style: styles.common });
  datasets
    .forEach(function (obj) {
      var line = ui.Panel({ style: styles.common });
      var checkbox = ui.Checkbox({
        label: obj.label,
        onChange: function (value) {
          if (value) { displaySelectedLayer(obj) }
          else { removeDeselectedLayer(obj) }
        },
        style: styles.common
      });
      line.add(checkbox);
      body.add(line);
      selectedBands[nameFromId(obj.id)] = [];
    });

  var layerSelector = ui.Panel({ style: styles.layerSelector });
  layerSelector.add(body);
  opt.panel.add(layerSelector);
}

function addBandsSelector(collection, label, name) {
  collection.first().bandNames().evaluate(function (bands) {
    if (bands.length === 0) { return collection }
    var placeholder = ui.Panel();
    placeholder.add(ui.Label(label));
    bands.forEach(function (band) {
      var line = ui.Panel({ style: styles.common });
      var checkbox = ui.Checkbox({
        label: band,
        onChange: function (value) {
          if (value) {
            selectedBands[name].push(band);
          }
          else {
            selectedBands[name].splice(selectedBands[name].indexOf(band), 1);
          }
          updateLayers();
        },
        style: styles.common
      });
      line.add(checkbox);
      placeholder.add(line);
    });
    if (opt.bandsPlaceholder[name] === undefined) {
      opt.bandsSelectorUi.add(placeholder);
      opt.bandsPlaceholder[name] = placeholder;
    }
  });
}
// LAYER METHODS
function updateLayers() {
  Map.clear();
  Map.add(opt.chartPanel);
  currentCollections = [];
  
  var landcoverVisParams= {
        'min':0,
        'max':62,
        'palette':require('users/mapbiomas/modules:Palettes.js').get('classification7'),
        'bands':['classification_'+selectors.selectedYear]
      }
  Map.addLayer(landcover,landcoverVisParams,'landcover')
  
  layers.forEach(function (name) {
    var selectedDataset = datasets.filter(function (el) {
      return el.name === name;
    })[0];
    var collection = ee.ImageCollection(selectedDataset.id);

    //Add bands selector for layer
    addBandsSelector(collection, selectedDataset.label, nameFromId(selectedDataset.id));

    //Date filtering routine
    var startDate = selectors.filterDate + '-01';
    var endDate = selectors.aggregateByYear
      ? selectors.selectedYear + '-12' + getFormattedLastDay()
      : selectors.filterDate + getFormattedLastDay();
    collection = collection.filterDate(startDate, endDate);

    //Region filtering routine
    if (selectors.roiType === 'state') {
      if(selectors.selectedState === "Brasil"){
        lastFeatureApplied = federation;
      } else {
        lastFeatureApplied = statesBrasil.filter('name_pt_br == "' + selectors.selectedState + '"');
      }
      var stateImage = getImageFromFeature(lastFeatureApplied);
      collection = collection.map(function (image) {
        return image.updateMask(stateImage);
      });
    }

    //Basin filtering routine
    if (basinFeature !== null && selectors.roiType === 'basin') {
      lastFeatureApplied = ee.FeatureCollection([basinFeature]);
      var basinImage = getImageFromFeature(lastFeatureApplied);
      collection = collection.map(function (image) {
        return image.updateMask(basinImage);
      });
    }

    //Biome filtering routine
    if (biomeFeature !== null && selectors.roiType === 'biome') {
      lastFeatureApplied = ee.FeatureCollection([biomeFeature]);
      var biomeImage = getImageFromFeature(lastFeatureApplied);
      collection = collection.map(function (image) {
        return image.updateMask(biomeImage);
      });
    }

    //Legal amazon filtering routine
    if (selectors.roiType === 'amazon') {
      lastFeatureApplied = ee.FeatureCollection(legalAmazonDataset.value);
      var amazonImage = getImageFromFeature(lastFeatureApplied);
      collection = collection.map(function (image) {
        return image.updateMask(amazonImage);
      });
    }

    //Drawing filtering routine
    if (selectors.roiType === 'manual') {
      if(Map.drawingTools().layers().length() > 0) {
        var drawingLayers = Map.drawingTools().layers();
        var drawingFeature = ee.FeatureCollection([]);
        drawingLayers.forEach(function (layer) {
          var geometries = layer.geometries();
          var polygonsAndRectangles = geometries.filter(function (selectedGeometry) {
            return ee.List(['Polygon', 'Rectangle']).contains(selectedGeometry.type());
          });
          var featuresToAdd = ee.FeatureCollection(polygonsAndRectangles.map(function (selectedGeometry) {
            return ee.Feature(selectedGeometry);
          }));
          drawingFeature = drawingFeature.merge(featuresToAdd);
        });
  
        lastFeatureApplied = drawingFeature;
        var drawingImage = getImageFromFeature(drawingFeature);
        if( opt.manualPopup !== undefined) {
          Map.remove(opt.manualPopup)
          opt.manualPopup = undefined;
        }
        collection = collection.map(function (image) {
          return image.updateMask(drawingImage);
        });
      }
      else {
        if( opt.manualPopup === undefined ) {
        opt.manualPopup = ui.Panel({
          style: { position: 'top-center' },
          widgets: [
            ui.Label({ value: 'Use as ferramentas à esquerda para desenhar a geometria de interesse.', style: { fontWeight: 'bold' } }),
          ]
        });
        Map.add(opt.manualPopup);
        }
      }
    }

    //Visualization params adjustment routine
    if(selectors.shouldReduce){
      collection = getAdjustedCollection(collection, nameFromId(selectedDataset.id));
    }
    
    currentCollections.push(collection);
    Map.addLayer(collection, {}, selectedDataset.name);
  });

  //Wait for basin selection
  if (selectors.roiType === 'basin' && selectors.selectedBasin !== '' && basinFeature === null) {
    var selected = ee.FeatureCollection(selectors.selectedBasin);
    Map.addLayer(selected, {}, '');
    opt.basinPopup = ui.Panel({
      style: { position: 'top-center' },
      widgets: [
        ui.Label({ value: 'Clique na região de interesse', style: { fontWeight: 'bold' } }),
      ]
    });
    Map.add(opt.basinPopup);
    Map.onClick(function (coords) {
      var point = ee.Geometry.Point(coords.lon, coords.lat);
      var feature = selected.filterBounds(point).first();
      if (feature) {
        basinFeature = feature;
        Map.remove(opt.basinPopup);
        updateLayers();
      }
    });
  }

  //Wait for biome selection
  if (selectors.roiType === 'biome' && biomeFeature === null) {
    var biome = ee.FeatureCollection(biomeDataset.value);
    Map.addLayer(biome, {}, '');
    opt.biomePopup = ui.Panel({
      style: { position: 'top-center' },
      widgets: [
        ui.Label({ value: 'Clique na região de interesse', style: { fontWeight: 'bold' } }),
      ]
    });
    Map.add(opt.biomePopup);
    Map.onClick(function (coords) {
      var point = ee.Geometry.Point(coords.lon, coords.lat);
      var feature = biome.filterBounds(point).first();
      if (feature) {
        biomeFeature = feature;
        Map.remove(opt.biomePopup);
        updateLayers();
      }
    });
  }

  if (selectors.showCharts) {
    updateCharts();
  }
}

function displaySelectedLayer(obj) {
  if (obj.name === undefined) {
    return null;
  }
  if (layers.indexOf(obj.name) === -1) {
    layers.push(obj.name);
  }
  updateLayers();
}

function removeDeselectedLayer(obj) {
  layers.splice(layers.indexOf(obj.name), 1);
  var selectedLayer = Map.layers().filter(
    function (layer) { return layer.getName() === obj.name }
  )[0];
  Map.remove(selectedLayer);
  currentCollections.splice(currentCollections.indexOf(obj), 1);
  opt.bandsSelectorUi.remove(opt.bandsPlaceholder[obj.name]);
  opt.bandsPlaceholder[obj.name] = undefined;
  selectedBands[nameFromId(obj.id)] = [];
}

function updateCharts() {
  opt.chartPanel.clear();
  opt.chartPanel.style().set('shown', true);
  if (layers.length === 0) {
    return opt.chartPanel.add(ui.Label('Selecione uma ou mais camadas de interesse.'));
  }
  lastFeatureApplied.evaluate(function (feature) {
    if (!feature) {
      return opt.chartPanel.add(ui.Label('Selecione um recorte.'));
    }
    currentCollections.forEach(function (collection) {
      collection.evaluate(function (col) {

        var collectionToSeries;
        if (selectors.aggregationType === 'yearly') {
          collection = ee.ImageCollection(col.id);
          var startDate = ee.Date(collection.reduceColumns(ee.Reducer.minMax(), ["system:time_start"]).get('min'));
          var endDate = ee.Date(collection.reduceColumns(ee.Reducer.minMax(), ["system:time_end"]).get('max'));
          
          collectionToSeries = ee.List.sequence(startDate.get('year'), endDate.get('year'), 1).getInfo().map(function (year) {
            var start = year === startDate.get('year') ? startDate : ee.Date('' + year + '-01-01');
            var end = year === endDate.get('year') ? endDate : start.advance(1, 'year');
            return ee.FeatureCollection(collection
              .select(selectedBands[nameFromId(col.id)].length === 0 ? '.*' : selectedBands[nameFromId(col.id)])
              .filterDate(start, end)
              .reduce(getReducerById(selectors.selectedReducer))
              .set({
                year: year,
                'system:time_start': start.millis(),
                'system:time_end': end.millis(),
              }));
          });
        }
        else if (selectors.aggregationType === 'monthly') {
          collection = ee.ImageCollection(col.id);
          
          if(selectors.aggregationPeriod === 'total'){
            var startDateTotal = ee.Date(collection.reduceColumns(ee.Reducer.minMax(), ["system:time_start"]).get('min'));
            var endDateTotal = ee.Date(collection.reduceColumns(ee.Reducer.minMax(), ["system:time_end"]).get('max'));
            var flattenedList = []
            ee.List.sequence(startDateTotal.get('year'), endDateTotal.get('year'), 1).getInfo()
            .map(function (year) {
              var start = year === startDateTotal.get('year') ? startDateTotal : ee.Date('' + year + '-01-01');
              var end = year === endDateTotal.get('year') ? endDateTotal : start.advance(1, 'year');
              return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(function (month) {
                  var selection = collection
                    .filterDate(start.advance(month-1,'month'), start.advance(month,'month'))
                    .select(selectedBands[nameFromId(col.id)].length === 0 ? '.*' : selectedBands[nameFromId(col.id)])
                    .reduce(getReducerById(selectors.selectedReducer))
                    .set({
                      year: year,
                      month: month,
                      'system:time_start': start.advance(month-1, 'month').millis(),
                      'system:time_end': start.advance(month, 'month').millis(),
                    })
                  return flattenedList.push(selection)
                })
            });
            collectionToSeries = ee.FeatureCollection(flattenedList)
          }
          
          else if (selectors.aggregationPeriod === 'year') {
            collectionToSeries = ee.FeatureCollection(
              [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(function (month) {
                var start = ee.Date('' + selectors.selectedYear + '-' + month + '-01');
                var end = start.advance(1, 'month');
                return collection
                  .select(selectedBands[nameFromId(col.id)].length === 0 ? '.*' : selectedBands[nameFromId(col.id)])
                  .filterDate(start, end)
                  .reduce(getReducerById(selectors.selectedReducer))
                  .set({
                    year: selectors.selectedYear,
                    month: month,
                    'system:time_start': start.millis(),
                    'system:time_end': end.millis(),
                  });
              })
            );
          }
        }
        var collectionScale = collection.first().projection().nominalScale();
        var seriesChart = ui.Chart.image.series(collectionToSeries, feature, getReducerById(selectors.selectedReducer), collectionScale);
        opt.chartPanel.add(seriesChart);
      });
    });
  });
}

// HELPERS
function getFormattedLastDay() {
  var tempDate = new Date(selectors.selectedYear, selectors.selectedMonth, 0);
  return '-' + tempDate.getDate();
}

function getImageFromFeature(feature) {
  return ee.Image(0).byte().paint(feature, 1);
}

function getAdjustedCollection(collection, name) {
  if (selectedBands[name].length === 0) { return collection }
  var reducedImage = collection.select(selectedBands[name]).reduce(ee.Reducer.minMax());
  var visParams = {
    bands: selectedBands[name],
    min: reducedImage.select('.*_min').reduceRegion(ee.Reducer.min(), ee.Geometry.BBox(-180, -90, 180, 90), null, 'EPSG:4326', [1, 0, 0, 0, 1, 0]).values(),
    max: reducedImage.select('.*_max').reduceRegion(ee.Reducer.max(), ee.Geometry.BBox(-180, -90, 180, 90), null, 'EPSG:4326', [1, 0, 0, 0, 1, 0]).values(),
  };
  return collection.map(function (image) {
    return image.visualize(visParams);
  });
}

function detectDrawings() {
  Map.drawingTools().onDraw(function (event) {
    updateLayers();
  });
  Map.drawingTools().onEdit(function (event) {
    updateLayers();
  });
  Map.drawingTools().onErase(function (event) {
    updateLayers();
  });
}

function nameFromId(id) {
  return id.split('/').reverse()[0];
}
function labelFromId(id) {
  var label = id.split('/').reverse()[0].toLowerCase();
  return label.charAt(0).toUpperCase() + label.slice(1).replace('_',' ');
}
var batch = require('users/fitoprincipe/geetools:batch');
function exportRoutine() {
  var featureGeometry = lastFeatureApplied.geometry().getInfo();
  currentCollections.forEach(function(col){
      var collectionScale = col.first().projection().nominalScale();
      batch.Download.ImageCollection.toDrive(ee.ImageCollection(col), 'atmosfera', {
        scale: collectionScale,
        region: featureGeometry, 
        type: 'float'
      });
  });
}
function getReducerById(id) {
  for (var i = 0; i < reducersMap.length; i++) {
    if (reducersMap[i].id === id) {
      return reducersMap[i].reducer;
    }
  }
}

// START ROUTINE
function start() {
  setLayout();
  detectDrawings();
}
start();
