define( [], function() {
    return {
        title       : 'NGL Viewer',
        library     : 'NGL',
        datatypes   : [ 'pdb' ],
        keywords    : 'NGL protein viewer pdb',
        description : 'NGL Viewer is a WebGL based molecular visualization hosted at http://arose.github.io/ngl/.',
        settings    : {
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
            radiustype : {
                label   : 'Radius Type',
                help    : 'Select a possible source of radius used for rendering the representation.',
                type    : 'select',
                display : 'radio',
                value   : '',
                data    : [ { label : 'By VDW radius', value : 'vdw' }, { label : 'By Covalent Radius', value : 'covalent' },
                            { label : 'By Secondary Structure', value : 'sstruc' }, { label : 'By B-Factor', value : 'bfactor' },
                            { label : 'Size', value : 'size' }, { label : 'Default', value : '' } ]
            },
            radius: {
                name  : 'radius',
                label : 'Radius',
                help  : 'Select a number providing a fixed radius used for rendering the representation.',
                type  : 'float',
                min   : 0.001,
                max   : 10.0,
                value : 0.7
            },
            scale: {
                name  : 'scale',
                label : 'Scale',
                help  : 'Select a number that scales the value defined by the *radius* or the *radiusType* parameter.',
                type  : 'float',
                min   : 0.001,
                max   : 10.0,
                value : 0.7
            },
            assembly : {
                label   : 'Assembly',
                help    : 'Select a name of an assembly object.',
                type    : 'select',
                display : 'radio',
                value   : 'default',
                data    : [ { label : 'Default', value : 'default' }, { label : 'AU', value : '' },
                            { label : 'BU1', value : 'BU1' }, { label : 'UNITCELL', value : 'UNITCELL' },
                            { label : 'SUPERCELL', value: 'SUPERCELL' } ]
            },
            viewer : {
                type        : 'conditional',
                test_param  : {
                    name    : 'mode',
                    label   : 'Display mode',
                    type    : 'select',
                    display : 'radio',
                    value   : 'cartoon',
                    help    : '',
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
                }
            }
        }
    }
});
