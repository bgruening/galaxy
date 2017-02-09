define( [ 'utilities/utils', "plugins/ngl/viewer" ], function( Utils, ngl ) {
    return Backbone.Model.extend({
        initialize: function( options ) {
            var dataset = options.dataset,
                settings = options.chart.settings,
                url = window.location.protocol + '//' + window.location.host + "/datasets/" + dataset.dataset_id +
                      "/display?to_ext=" + dataset.extension;
            
            Utils.get( {
                url     : url,
                cache   : true,
                success : function( response ) {
                    var viewer_options = {};
                    _.each( settings.attributes, function( value, key ) {
                        if ( key.startsWith( 'viewer|' ) ) {
                            viewer_options[ key.replace( 'viewer|', '' ) ] = value;
                        }
                    });

                    var stage = new ngl.Stage( options.targets[ 0 ], { backgroundColor: settings.get( 'backcolor' ) } );
                    stage.loadFile( url, {ext: dataset.extension, name: dataset.name, defaultRepresentation: true} ).then( function( o ) {
                        o.addRepresentation( viewer_options.mode, { radius: viewer_options.radius } );
                        o.centerView();
                    });
                    stage.setQuality( settings.get( 'quality' ) );
                    options.chart.state( 'ok', 'Chart drawn.' );
                    options.process.resolve();
                },
                error   : function() {
                    options.chart.state( 'ok', 'Failed to load pdb file.' );
                    options.process.resolve();
                }
            });
        }
    });
});
