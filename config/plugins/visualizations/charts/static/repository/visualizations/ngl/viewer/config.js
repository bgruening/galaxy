define( [], function() {
    return {
        title       : 'NGL Viewer',
        library     : 'NGL',
        datatypes   : [ 'pdb' ],
        keywords    : 'NGL protein viewer pdb',
        description : 'NGL Viewer is a WebGL based molecular visualization hosted at http://arose.github.io/ngl/.',settings    : {
            quality : {
                label   : 'Quality',
                help    : 'Select the rendering quality.',
                type    : 'select',
                display : 'radio',
                value   : 'medium',
                data    : [ { label : 'High', value : 'high' }, { label : 'Medium', value : 'medium' }, { label : 'Low', value : 'low' } ]
            }, 
            backcolor : {
                label   : 'Background Color',
                help    : 'Select background color of the viewer.',
                type    : 'select',
                display : 'radio',
                value   : 'white',
                data    : [ { label : 'Light', value : 'white' }, { label : 'Dark', value : 'black' } ]
            },
            spin : {
                label   : 'Spin',
                help    : 'Spin the molecule view.',
                type    : 'select',
                display : 'radio',
                value   : false,
                data    : [ { label : 'On', value : true }, { label : 'Off', value : false } ]
            },
            viewer : {
                type        : 'conditional',
                test_param  : {
                    name    : 'mode',
                    label   : 'Display mode',
                    type    : 'select',
                    display : 'radio',
                    value   : 'cartoon',
                    help    : 'Select the rendering mode.',
                    data    : [ { label : 'Cartoon', value : 'cartoon' },
                                { label : 'Line', value : 'line' },
                                { label : 'Base', value : 'base' },
                                { label : 'Backbone', value : 'backbone' },
                                { label : 'Ball+Stick', value : 'ball+stick' },
                                { label : 'Contact', value : 'contact' },
                                { label : 'Helixorient', value : 'helixorient' },
                                { label : 'Hyperball', value : 'hyperball' },
                                { label : 'Label', value : 'label' },
                                { label : 'Licorice', value : 'licorice' },
                                { label : 'Point', value : 'point' },
                                { label : 'Ribbon', value : 'ribbon' },
                                { label : 'Rocket', value : 'rocket' },
                                { label : 'Rope', value : 'rope' },
                                { label : 'Spacefill', value : 'spacefill' },
                                { label : 'Surface', value : 'surface' },
                                { label : 'Trace', value : 'trace' },
                                { label : 'Tube', value : 'tube' }
                              ]
                },
                cases       : [ { value : 'cartoon', inputs: [ {
                                    name  : 'radius',
                                    label : 'Radius',
                                    help  : 'Radius of tube profile. Also influences the profile thickness for helix and strand profiles.',
                                    type  : 'float',
                                    min   : 0.1,
                                    max   : 3,
                                    value : 0.3
                                } ] }
                            ]
            }
        }
    }
});
