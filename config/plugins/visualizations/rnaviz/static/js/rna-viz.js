
/***

RNA-RNA interactions viewer. It reads sqlite file 
and shows up the list of interactions and a summary 
along with cytoscape graphs

***/

var RNAInteractionViewer = (function( riv ) {
 
    riv.modelHeaders = null;
    riv.showRecords = 1000;
    riv.model = null;
    riv.configObject = null;
    riv.minQueryLength = 3;

    /** Create a url with the specified query */
    riv.formUrl = function( configObject, query ) {
        return configObject.href + '/api/datasets/' + configObject.datasetID + '?data_type=raw_data&provider=sqlite-table&headers=True' + query;
    };

    /** Make an ajax call with a url */
    riv.ajaxCall = function( url, configObject, callBack ) {
        $.get( url, function( data ) {
            callBack( configObject, data );
        });
    };

    /** Create the UI when a sqlite file is clicked */
    riv.createUI = function( configObject, data ) {
        var records = data.data,
            templateText = "",
            $elContainer = $( ".main-container" );
 
        templateText = riv.createInteractionTemplate( configObject );
        $elContainer.html( templateText );
        $elContainer.find( ".one-sample" ).show();
        riv.registerPageEvents();
        riv.buildInteractionsPanel( configObject, records );
    };
    
    riv.registerPageEvents = function() {
        var $elSearchGene = $( '.search-gene' ),
            $elSort = $( '.rna-sort' ),
            $elFilter = $( '.rna-filter' ),
            $elFilterVal = $( '.filter-value' ),
            $elExport = $( '.export-results' ),
            $elResetFilters = $( '.reset-filters' ),
            $elSummary = $( '.rna-summary' );

        // search query event
        $elSearchGene.off( 'keyup' ).on( 'keyup', function( e ) {
            riv.searchGene( e );
        });

        // onchange for sort
        $elSort.off( 'change' ).on( 'change', function( e ) {
            riv.sortInteractions( e );
        });

        // onchange for filter
        $elFilter.off( 'change' ).on( 'change', function( e ) {
            riv.filterInteractions( e );
        });

        // fetch records using filter's value
        $elFilterVal.off( 'keyup' ).on( 'keyup', function( e ) {
            riv.setFilterValue( e );
        });

        // export samples in the workspace
        $elExport.off( 'click' ).on( 'click', function( e ) {
            riv.exportInteractions( e );
        });

        // reset the filters
        $elResetFilters.off( 'click' ).on( 'click', function( e ) {
            riv.resetFilters( e );
        });

        $elSummary.off( 'click' ).on( 'click', function( e ) {
            riv.getInteractionsSummary( e );
        });
    };
    
    /** Callback for searching interactions */ 
    riv.searchGene = function( e ) {
        e.preventDefault();
        var query = e.target.value;
        if( query.length >= riv.minQueryLength ) {
            if( e.which === 13 || e.keyCode == 13 ) {
                riv.makeSearch( query );
            }
        }
        else {
            return false;
        }
    };
    
    riv.makeSearch = function( query ) {
        var queryLike = "%" + query + "%",
            colNames = { "txid1": queryLike, "txid2": queryLike, "geneid1": queryLike,
                         "geneid2": queryLike, "symbol1":queryLike, "symbol2": queryLike,
                         "type1":queryLike, "type2": queryLike },              
            dbQuery = riv.constructQuery( riv.configObject.tableNames[ "name" ], colNames, "LIKE", "OR" ),
            url = riv.formUrl( riv.configObject, dbQuery );
        riv.ajaxCall( url, riv.configObject, riv.createUI );
    };
    
    riv.setDefaultFilters = function() {
        $( '.rna-filter' ).val( "-1" );
        $( '.filter-operator' ).hide();
        $( '.filter-operator' ).val( "-1" );
        $( '.filter-value' )[ 0 ].value = "";
        $( '.search-gene' )[ 0 ].value = "";
        $( '.rna-sort' ).val( "score" );
        $( '.check-all-interactions' )[ 0 ].checked = false;
        riv.cleanSummary();
    };

    /** Create a list of interactions panel */
    riv.buildInteractionsPanel = function( configObject, records ) {
        var $elParentInteractionIds = $( ".rna-transcriptions-container" ),
            $elInteractionsList = $( ".transcriptions-ids" ),
            $elShowModelSizeText = $( ".sample-current-size" ),
            sizeText = "",
            interactionsTemplate = "",
            header = null,
            interactions = null;
        
        if ( records && records.length > 0 ) {
            // set the models
            riv.modelHeaders = records[ 0 ];
            riv.model = records.slice( 1, records.length );
            // show how many records being shown
            if( riv.model.length >= riv.showRecords ) {
                sizeText = "Showing <b>" + riv.showRecords + "</b> interactions of <b>" + riv.model.length + "</b>";
            }
            else {
                sizeText = "Showing only <b>" + riv.model.length + " </b>interactions";
            }
            $elShowModelSizeText.empty().html( sizeText );

            _.each( riv.model, function( item ) {
                interactionsTemplate = interactionsTemplate + riv.createInteractionsListTemplate( item );
            });
            
            var interactionsPromise = new Promise( function( resolve, reject ) {
                resolve( $elInteractionsList.append( interactionsTemplate ) );
            });

            interactionsPromise.then( function() {
                riv.createFancyScroll( 'transcriptions-ids' );
                riv.registerEventsInteractions();
            });
        }
        else {
           $elInteractionsList.html( "<div> No results found. </div>" );
           return;
        }     
        $elInteractionsList.show();
    };

    /** Register events for the items in the interactions list */
    riv.registerEventsInteractions = function() {
        var $elRNAPair = $( '.rna-pair' );

        // highlight the transaction pair
        $elRNAPair.off( 'mouseenter' ).on( 'mouseenter', function() {
            $( this ).addClass( 'pair-mouseenter' );
        });

        // remove the highlighted background on focus remove
        $elRNAPair.off( 'mouseleave' ).on( 'mouseleave', function() {
            $( this ).removeClass( 'pair-mouseenter' );
        });

        // fire when one interaction is selected
        $elRNAPair.off( 'click' ).on( 'click', function( e ) {
            var interactionId = "",
                records = riv.model;
            if ( e.target.tagName !== "INPUT" ) {
                if( e.target.childElementCount > 0 ) {
                    interactionId = e.target.children[ 0 ].id;
                }
                else {
                    interactionId = e.target.parentElement.children[ 0 ].id;
                }
                $elRNAPair.removeClass( 'selected-item' );
                for( var ctr = 0, len = records.length; ctr < len; ctr++ ) {
                    var item = records[ ctr ];
                    if( item[ 0 ].toString() === interactionId.toString() ) {
                        $( this ).addClass( ' selected-item' );
                        riv.buildRNAPairInformation( item );
                        riv.fetchRNAPairGraphInformation( item );
                        break;
                    }
                }
            }
        });
    };

    /** Create a UI for summary when an interacting pair is selected */
    riv.buildRNAPairInformation = function( item ) {
        var $elBothGenes = $( ".both-genes" ),
            energyClass = parseFloat( item[ 32 ] ) <= 0 ? "energy-negative" : "energy-positive",
            energyExpr = window.decodeURI("\u0394") + "G" + " = " + "<span class=" + energyClass + ">" + item[ 32 ] + "</span> kcal/mol",
            alignment = "",
            sequenceInfo = {},
            noAlignmentTemplate = "<span class='no-alignment'>No alignment available</span>";

        riv.cleanSummary();
        $elBothGenes.empty();
        riv.showHideGeneSections( false );

        sequenceInfo = {
            sequences: item[ 29 ],
            dotbrackets: item[ 30 ],
            startindices: "1&1" // sequences in the file are already carved-out
        };

        alignment = ( sequenceInfo.dotbrackets.indexOf( ")" ) === -1 ) ? noAlignmentTemplate : riv.fetchAlignment( sequenceInfo );
        $elBothGenes.append( riv.createAlignmentTemplate( alignment, energyExpr ) );

        $elBothGenes.append( "<div class='interaction-header'>Genes Information </div>" );
        $elBothGenes.append( riv.createSelectedPairInformation( item, "info-gene1", 0 ) );
        $elBothGenes.append( riv.createSelectedPairInformation( item, "info-gene2", 1 ) );

        riv.createFancyScroll( "single-interactions-info" );
        riv.buildAligmentGraphics( item );

        // event for downloading alignment as text file
        $( '.download-alignment' ).off( 'click' ).on( 'click', function( e ) {
            e.preventDefault();
            e.stopPropagation();
            riv.exportAlignment();
        });
    };

    /** Round off to a certain precision */
    riv.roundPrecision = function( number, precision ) {
        var factor = Math.pow( 10, precision ),
            numberFac = number * factor,
            roundedNum = Math.round( numberFac );
        return roundedNum / factor;
    };

    /** Export alignment */
    riv.exportAlignment = function() {
        var data = "",
            link = document.createElement( 'a' );
        data = $( '.pre-align' ).text();
        data = window.encodeURIComponent( data );
        link.setAttribute( 'href', 'data:application/octet-stream,' + data );
        link.setAttribute( 'download', Date.now().toString( 16 ) + '_seq_alignment.txt' );
        document.body.appendChild( link );
        linkClick = link.click();
    };

    /** Draw graphics for alignment */
    riv.buildAligmentGraphics = function( item ) {
        var dataGene = {};
        // first gene
        dataGene = {
            startPos: item[ 10 ],
            endPos: item[ 11 ],
            seqLength: item[ 12 ],
            scale: 100
        }
        $( "#align-pos-1" ).html( riv.drawSingleSvg( dataGene ) );

        // second gene
        dataGene = {
            startPos: item[ 13 ],
            endPos: item[ 14 ],
            seqLength: item[ 15 ],
            scale: 100
        }
        $( "#align-pos-2" ).html( riv.drawSingleSvg( dataGene ) );
    };

    /** Draw SVG graphics */
    riv.drawSingleSvg = function( data ) {
        var scale = data.seqLength < data.scale ? data.seqLength : data.scale,
            ratio = scale / data.seqLength,
            xOffset = 10,
            scaledBegin = parseInt( ratio * data.startPos ) + xOffset,
	    scaledEnd = parseInt( ratio * data.endPos ) + xOffset,
            heightDiff = 30,
            textYDiff = 5,
            barLength = ( data.endPos - data.startPos ),
            seqEndPos = scaledBegin + barLength + ratio * ( data.seqLength - data.endPos ),
            seqLengthTextXPos = xOffset + seqEndPos,
            template = "";
	template = '<line x1="'+ xOffset +'" y1="'+ heightDiff +'" x2="'+ scaledBegin +'" y2="'+ heightDiff +'" style="stroke:black;stroke-width:2" />' +
            '<rect x="'+ scaledBegin +'" y="'+ (heightDiff - 5) +'" width="'+ barLength +'" height="10" style="fill:green" />' +
            '<line x1="'+ ( scaledBegin + barLength ) +'" y1="'+ heightDiff +'" x2="'+ seqEndPos +'" y2="'+ heightDiff +'" style="stroke:black;stroke-width:2" />' +
            '<text x="'+ seqLengthTextXPos +'" y="'+ ( heightDiff + textYDiff ) +'" fill="black">'+ data.seqLength +'</text>';
        return template;
    };

    /** Fetch alignment between two sequences */
    riv.fetchAlignment = function( sequenceInfo ) {
        var sequences = sequenceInfo.sequences;
            dotBrackets = sequenceInfo.dotbrackets,
            startIndices = sequenceInfo.startindices,
            dotbracket1 = [],
            docbracket2 = [],
            alignmentPositions = [],
            dotbracket1Length = 0,
            dotbracket2Length = 0,
            startIndex1 = 0,
            startIndex2 = 0,
            viz4d = null,
            alignment = null;

        sequences = sequences.split( "&" );
        dotBrackets = dotBrackets.split( "&" );
        startIndices = startIndices.split( "&" );
        dotbracket1 = dotBrackets[ 0 ].split( "" );
        dotbracket2 = dotBrackets[ 1 ].split( "" );
        dotbracket1Length = dotbracket1.length;
        dotbracket2Length = dotbracket2.length;

        // find corresponding alignment positions using dotbracket notations
        // look for corresponding opening and closing brackets in both sequences
        // having second sequence in the reverse order
        for( var dotbrac1Ctr = 0; dotbrac1Ctr < dotbracket1Length; dotbrac1Ctr++ ) {
            if ( dotbracket1[ dotbrac1Ctr ] === '(' ) {
                var alignPos = [];
                alignPos.push( dotbrac1Ctr + 1 );
                dotbracket1[ dotbrac1Ctr ] = ".";
                for( var dotbrac2Ctr = dotbracket2Length - 1; dotbrac2Ctr >= 0; dotbrac2Ctr-- ) {
                    if( dotbracket2[ dotbrac2Ctr ] === ')' ) {
                        alignPos.push( dotbrac2Ctr + 1 );
                        alignmentPositions.push( alignPos );
                        dotbracket2[ dotbrac2Ctr ] = '.';
                        break;
                    }
                }
            }
        }

        // get the alignment
        viz4d = VisualizeAlignment.visualize4d( sequences[ 0 ], sequences[ 1 ], alignmentPositions );
        alignment = VisualizeAlignment.repres( viz4d );
        return alignment;
    };
    
    riv.constructQuery = function( tableName, conditionValueDict={}, equalityOp="=", joinCondition="", orderByCol="score", orderByDirection="DESC" ) {
        var query = "&query=",
            colsNum = Object.keys( conditionValueDict ).length;
        query = query + "SELECT * FROM " + tableName;
        if( Object.keys( conditionValueDict ) && Object.keys( conditionValueDict ).length > 0 ) {
            query = query + " WHERE ";
            var colsCounter = 0;
            for( var item in conditionValueDict ) {
                query = query + tableName + "." + item + " " + equalityOp + " " + "'" + conditionValueDict[ item ] + "'";
                if( colsCounter < colsNum - 1 ) {
                    query = query + " " + joinCondition + " ";
                }
                colsCounter++;
            }
        }
        query = query + " ORDER BY " + tableName + "." + orderByCol + " " + orderByDirection;
        return query;
    };

    /** Create Cytoscape graphs */
    riv.fetchRNAPairGraphInformation = function( item ) {
        var graphLoadingText = "<p class='load-graph'>loading interactions graph...</p>",
            colNames = { "geneid1": item[ 4 ], "geneid2": item[ 5 ] },
            query = "";
        query = riv.constructQuery( riv.configObject.tableNames[ "name" ], colNames, "=","OR" );
        $( "#interaction-graph-1" ).html( graphLoadingText );
        $( "#interaction-graph-2" ).html( graphLoadingText );
        riv.configObject.gene1 = item[ 4 ];
        riv.configObject.gene2 = item[ 5 ];
        var url = riv.formUrl( riv.configObject, query );
        riv.ajaxCall( url, riv.configObject, riv.separateInteractions );
    };

    /** Separate the records based on geneids for creating two cytoscape graphs */
    riv.separateInteractions = function( configObject, records ) {
        var data = records.data,
            gene1InteractionsUnpacked = [],
            gene2InteractionsUnpacked = [];

        _.each( data, function( rec ) {
            if( rec[ 4 ] === configObject.gene1 ) {
                gene1InteractionsUnpacked.push( rec );
            }
            else if( rec[ 5 ] === configObject.gene2 ) {
                gene2InteractionsUnpacked.push( rec );
            }
        });
        
        riv.buildCytoscapeGraphData( gene1InteractionsUnpacked, gene2InteractionsUnpacked );
    };
    
    /** Create data for building cytoscape graphs */
    riv.buildCytoscapeGraphData = function( interactions1, interactions2 ) {
        var $elGene1 = document.getElementById( 'interaction-graph-1' ),
            $elGene2 = document.getElementById( 'interaction-graph-2' ),
            gene1Nodes = [],
            gene1Edges = [],
            gene2Nodes = [],
            gene2Edges = [];

        $elGene1.style.width = "400px";
        $elGene1.style.height = "220px";
        $elGene1.style.position = "relative";
        $elGene2.style.width = "400px";
        $elGene2.style.height = "220px";
        $elGene2.style.position = "relative";

        var source1 = interactions1[ 0 ][ 4 ];
        gene1Nodes.push( {
            data: { id: source1 }
        });

        // alignment scores
        var scores1 = interactions1.map(function( row ) {
                          return row[ 28 ];
                      });
        var maxScore1 = scores1.reduce(function(a, b) {
                            return Math.max(a, b);
                        });

        var scores2 = interactions2.map(function( row ) {
                          return row[ 28 ];
                      });

        var maxScore2 = scores2.reduce(function(a, b) {
                            return Math.max(a, b);
                        });

        // gene expression
        var expression1 = interactions1.map(function( row ) { 
                          return row[ 25 ];
                      });
        var maxExpr1 = expression1.reduce(function(a, b) {
                            return Math.max(a, b);
                        });

        var expression2 = interactions2.map(function( row ) { 
                          return row[ 24 ];
                      });

        var maxExpr2 = expression2.reduce(function(a, b) {
                          return Math.max(a, b);
                      });

        _.each( interactions1, function( item ) {
            var targetGeneId = item[ 5 ];
            gene1Nodes.push( {
                data: { id: targetGeneId, weight: ( item[ 25 ] / maxExpr1 ) }
            });
            gene1Edges.push( {
                data: { source: source1, target: targetGeneId, weight: ( item[ 28 ] / maxScore1 ) }
            });
        });

        var source2 = interactions2[ 0 ][ 5 ];
        gene2Nodes.push( {
            data: { id: source2 }
        });

        _.each( interactions2, function( item ) {
            var targetGeneId = item[ 4 ];
            gene2Nodes.push( {
                data: { id: targetGeneId, weight: ( item[ 24 ] / maxExpr2 ) }
            });
            gene2Edges.push( {
                data: { source: source2, target: targetGeneId, weight: ( item[ 28 ] / maxScore2 ) }
            });
        });

        // make call to cytoscape to generate graphs
        var cytoscapePromise = new Promise( function( resolve, reject ) {
            resolve( riv.makeCytoGraph( { elem: $elGene1, nodes: gene1Nodes, edges: gene1Edges } ) );
            resolve( riv.makeCytoGraph( { elem: $elGene2, nodes: gene2Nodes, edges: gene2Edges } ) );
        });

        cytoscapePromise.then(function() {
            $( "#interaction-graph-1" ).find( '.load-graph' ).remove();
            $( "#interaction-graph-2" ).find( '.load-graph' ).remove();
        });
    };

    /** Create cytoscape graph */
    riv.makeCytoGraph = function( data ) {
        var graph = null;
        graph = cytoscape({
            container: data.elem,
            elements: {
                nodes: data.nodes,
                edges: data.edges
            },
            layout: {
                name: 'concentric'
            },
            style: [
                {
                    selector: 'node',
                    style: {
                        'content': 'data(id)',
                        'width': 'mapData(weight, 0, 1, 20, 60)',
                        'height': 'mapData(weight, 0, 1, 20, 60)',
                        'text-opacity': 1,
                        'text-valign': 'center',
                        'text-halign': 'right',
                        'background-color': '#337ab7',
                        'font-size': '9pt',
                        'font-family': '"Lucida Grande", verdana, arial, helvetica, sans-serif'
                    }
                },

                {
                    selector: 'edge',
                    style: {
                        "width": "mapData(weight, 0, 1, 1, 8)",
                        'line-color': '#9dbaea',
                        'curve-style': 'haystack',
                        'target-arrow-shape': 'triangle',
                        'font-size': '9pt',
                        'font-family': '"Lucida Grande", verdana, arial, helvetica, sans-serif'
                    }
                }
            ]
        });

        // when a node is tapped, make a search with the node's text
        // when a node is tapped, make a search with the node's text
        graph.on( 'tap', 'node', function( ev ) {
            var query = this.id(),
                conf = window.confirm( "Do you want to make a search for geneid - " + query );
            if ( conf && conf === true ) {
                riv.makeSearch( query );
                $( ".search-gene" ).val( query );
            }
            else {
                return false;
            }
        });

        $( window ).resize(function( e ) {
            graph.resize();
        });

        return graph;
    };

    /** Switch between two sections and one section */
    riv.showHideGeneSections = function( show ) {
        if ( show ) {
            $( ".first-gene" ).show();
            $( ".second-gene" ).show();
            $( ".both-genes" ).hide();
        }
        else {
            $( ".first-gene" ).hide();
            $( ".second-gene" ).hide();
            $( ".both-genes" ).show();
        }
    }

    /** Clear the UI elements */
    riv.cleanSummary = function() {
        $( "#rna-score" ).empty();
        $( "#rna-type2" ).empty();
        $( "#rna-score1" ).empty();
        $( "#rna-score2" ).empty();
        $( "#rna-energy" ).empty();
        $( ".both-genes" ).empty();
        $( "#rna-alignment-graphics1" ).empty();
        $( "#rna-alignment-graphics2" ).empty();
        $( "#rna-expr1" ).empty();
        $( "#rna-expr2" ).empty();
        $( "#rna-symbol1" ).empty();
        $( "#interaction-graph-1" ).empty();
        $( "#interaction-graph-2" ).empty();
    }

    /** Load sqlite dataset records on first load of the visualization */
    riv.loadData = function( configObject ) {
        var query = '&query=SELECT * FROM ' + configObject.tableNames[ "name" ],
            urlValue = riv.formUrl( configObject, query );
        riv.configObject = configObject
        riv.ajaxCall( urlValue, configObject, riv.createUI );
    };

    /** Create fancy scrollbars */
    riv.createFancyScroll = function ( className ) {
        $( '.' + className ).mCustomScrollbar({
            theme:"minimal",
            scrollInertia: 1,
            mouseWheel: { enable: false }
        });
        $( '.' + className + ' .mCSB_dragger_bar' ).css( 'background-color', 'black' );
    };

    riv.createSelectedPairInformation = function( item, id, filePos ) {
        var svgTitle = filePos == 1 ? "Gene aligning positions. The sequence as well as alignment length is scaled to 100 pixels" : "Gene aligning positions";
        return '<span id="'+ id +'" class="single-interactions-info">' +
	               '<p><b>Geneid</b>: ' + item[ 4 + filePos ] + '</p>' +
	               '<p><b>Symbol</b>: ' + item[ 6 + filePos ] + '</p>' +
	               '<p><b>Type</b>: ' + item[ 8 + filePos ] + '</p>' +
                       '<p><b>Gene Expression </b>: ' + riv.roundPrecision( parseFloat( item[ 24 + filePos ] ), 1 ) + '</p>' +
	               '<p><b>Score'+ ( filePos + 1) + '</b>: ' + riv.roundPrecision( parseFloat( item[ 26 + filePos ] ), 1 ) + '</p>' +
                       '<p><b>Gene Aligning Positions:</b></p><svg height="50" width="300" id="align-pos-'+ ( filePos + 1) +'" title="'+ svgTitle +'"></svg>' +
                       '<p><b>Gene interactions graph:</b></p><div id=interaction-graph-'+ (filePos + 1) +'></div>' +
	        '</span>';
    },

    riv.createAlignmentTemplate = function( alignment, energyExpr ) {
        return "<div class='interaction-header'>Alignment Information  <a href='#' class='download-alignment'" +
               "title='Download the alignment as text file'><i class='fa fa-download' aria-hidden='true'></i>" +
               "</a></div>" +
               "<span class='alignment-energy' title='Gibbs free energy'>" + energyExpr + "</span>" +
               "<div class='seq-alignment' title='Sequence alignment'><pre class='pre-align'>" + alignment + "</pre></div>";
    };

    riv.createInteractionsListTemplate = function( record ) {
        return '<div class="rna-pair"><input type="checkbox" id="'+ record[ 0 ] +'" value="" class="rna-interaction" />' +
               '<span class="rna-pair-interaction">' + record[ 2 ] + '-' + record[ 3 ]  + '</span></div>';
    }; 

    riv.createInteractionTemplate = function( options ) {
        return '<div class="container one-sample">' +
                   '<div class="row">' +
                       '<div class="col-sm-2 elem-rna">' +
                           '<div class="sample-name">' + options.dataName +'</div>' +
                           '<div class="sample-current-size"></div>' +
                       '</div>' +
                       '<div class="col-sm-2 elem-rna">' +
                           '<input type="text" class="search-gene form-control elem-rna" value="" placeholder="Search..." title="Search">' +
                       '</div>' +
                       '<div class="col-sm-2 elem-rna">' +
                           '<select name="sort" class="rna-sort elem-rna form-control elem-rna" title="Sort">' +
	                       '<option value="score">Score</option>' +
                               '<option value="energy">Energy</option>' +
                           '</select>' +
                       '</div>' +
                       '<div class="col-sm-6 elem-rna">' +
	                   '<select name="filter" class="rna-filter form-control elem-rna" title="Filter">' +
		               '<option value="-1">Filter by...</option>' +
		               '<option value="score">Score</option>' +
		               '<option value="family">RNA Family</option>' +
	                   '</select>' +
                           '<select name="filter-operator" class="filter-operator form-control elem-rna" title="Filter operator">' +
        	               '<option value="-1">Choose operator...</option>' +
	                       '<option value="equal">=</option>' +
	                       '<option value="greaterthan">></option>' +
                               '<option value="lessthan"><</option>' +
                               '<option value="lessthanequal"><=</option>' +
                               '<option value="greaterthanequal">>=</option>' +
                               '<option value="notequalto"><></option>' +
                           '</select>' +
                         '<input type="text" class="filter-value form-control elem-rna" title="Enter the selected filter value"' +
                             'value="" placeholder="Enter the selected filters value..." />' +
                       '</div>' +
                   '</div>' +
                   '<div class="row rna-results">' +
                       '<div class="col-sm-2 rna-transcriptions-container">' +
                           '<div class="transcriptions-ids"></div>' +
                       '</div>' +
                       '<div class="col-sm-10 both-genes"></div>' +
                       '<div class="col-sm-5 first-gene">' +
                           '<div id="rna-symbol1"></div>' +
                           '<div id="rna-score"></div>' +
                           '<div id="rna-score1"></div>' +
                           '<div id="rna-energy"></div>' +
                           '<div id="rna-expr1"></div>' +
                           '<div id="rna-alignment-graphics1"></div>' +
                       '</div>' +
                       '<div class="col-sm-5 second-gene">' +
                           '<div id="rna-type2"></div>' +
                           '<div id="rna-score2"></div>' +
                           '<div id="rna-expr2"></div>' +
                           '<div id="rna-alignment-graphics2"></div>' +
                       '</div>' +
                   '</div>' +
                   '<div class="row">' +
                       '<div class="col-sm-10">' +
                           '<input id="check_all_interactions" type="checkbox" class="check-all-interactions"' +
                               'value="false" title="Check 1000 interactions" />' +
                           '<span>Check all above</span>' +
		           '<button type="button" class="rna-summary btn btn-primary btn-rna btn-interaction" title="Get summary of RNA-RNA interactions">' +
			       'Summary' +
		           '</button>' +
		           '<button type="button" class="export-results btn btn-primary btn-rna btn-interaction"' +
                               'title="Export results as tab-separated file">' +
			       'Export' +
		           '</button>' +
		           '<button type="button" class="reset-filters btn btn-primary btn-rna btn-interaction"' +
                                  'title="Reset all the filters and reload original interactions">' +
			      'Reset filters' +
		           '</button>' +
                       '</div>' +
                       '<div class="col-sm-2"></div>' +
                   '</div>' +
               '</div>';

    };

    
    return riv;
}( RNAInteractionViewer || {} ) );
