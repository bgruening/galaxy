define( [ 'utilities/utils', "plugins/ngl/viewer" ], function( Utils, ngl ) {
    return Backbone.Model.extend({
        initialize: function( options ) {
            var dataset = options.dataset,
                url = window.location.protocol + '//' + window.location.host + "/datasets/" + dataset.dataset_id +
                      "/display?to_ext=" + dataset.extension;
            Utils.get( {
                url     : url,
                cache   : true,
                success : function( response ) {
                    var stage = new ngl.Stage( options.targets[ 0 ] );
                    stage.loadFile( url, {ext: dataset.extension, name: dataset.name, defaultRepresentation: true} );
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
