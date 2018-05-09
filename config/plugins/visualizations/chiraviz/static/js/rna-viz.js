
/***

RNA-RNA interactions viewer. It reads sqlite file 
and shows up the list of interactions and a summary 
along with cytoscape graphs

***/

var RNAInteractionViewer = (function( riv ) {
 
    riv.modelHeaders = null;
    riv.configObject = null;
    riv.model = null;
    riv.showRecords = 5000;
    riv.minQueryLength = 3;
    riv.$elLoader = $( '.loader' );

    /** Create a url with the specified query */
    riv.formUrl = function( configObject, query ) {
        return configObject.href + '/api/datasets/' + configObject.datasetID + '?data_type=raw_data&provider=sqlite-table&headers=True' + query;
    };

    /** Make an ajax call with a url */
    riv.ajaxCall = function( url, callBack, configOb={} ) {
        riv.$elLoader.show();
        $.get( url, function( data ) {
            callBack( data, configOb );
        });
    };

    /** Create the UI when a sqlite file is clicked */
    riv.createUI = function( data  ) {
        let templateText = "",
            $elContainer = $( ".main-container" );
 
        templateText = riv.createInteractionTemplate();
        $elContainer.append( templateText );
        $elContainer.find( ".one-sample" ).show();
        riv.registerPageEvents();
        riv.buildInteractionsPanel( data );
        riv.$elLoader.hide();
    };
    
    /** Register events for UI elements */
    riv.registerPageEvents = function() {
        let $elSearchGene = $( '.search-gene' ),
            $elSort = $( '.rna-sort' ),
            $elFilterVal = $( '.filter-value' ),
            $elExport = $( '.export-results' ),
            $elResetFilters = $( '.reset-filters' ),
            $elToggleLeftPanel = $( '.toggle-left' ),
            $elSummary = $( '.rna-summary' ),
            $elCheckAll = $( '.check-all-interactions' ),
            $elSearchGeneImage = $( '.search-gene-image' ),
            $elFilterValueImage = $( '.filter-value-image' );

        $elSearchGeneImage.off( 'click' ).on( 'click', function( e ) {
            let query = $elSearchGene.val();
            if ( query.length >= riv.minQueryLength ) {
                riv.cascadeSearch();
            }
        });

        $elFilterValueImage.off( 'click' ).on( 'click', function( e ) {
            let query = $elFilterVal.val();
            if ( query.length > 0 ) {
                riv.cascadeSearch();
            }
        });

        // search query event
        $elSearchGene.off( 'keyup' ).on( 'keyup', function( e ) {
            if( e.which === 13 || e.keyCode === 13 ) { // search on enter click
                riv.cascadeSearch();
            }
        });

        // onchange for sort
        $elSort.off( 'change' ).on( 'change', function( e ) {
            riv.cascadeSearch();
        });

        // fetch records using filter's value
        $elFilterVal.off( 'keyup' ).on( 'keyup', function( e ) {
            if( e.which === 13 || e.keyCode === 13 ) { // search on enter click
                riv.cascadeSearch();
            }
        });

        // export samples in the workspace
        $elExport.off( 'click' ).on( 'click', function( e ) {
            riv.fetchInteractionsSummaryExport( riv.createExportData );
        });

        // reset the filters
        $elResetFilters.off( 'click' ).on( 'click', function( e ) {
            riv.resetFilters( e );
        });

        // summary event
        $elSummary.off( 'click' ).on( 'click', function( e ) {
            riv.getInteractionsSummary( e );
        });
        
        // check all event
        $elCheckAll.off( 'click' ).on( 'click', function( e ) {
            riv.checkAllInteractions( e );
        });

        // check all event
        $elToggleLeftPanel.off( 'click' ).on( 'click', function( e ) {
            riv.toggleLeftPanel( e );
        });  
    };

    // Cascade search
    riv.cascadeSearch = function() {
        let url = riv.makeSearchURL();
        riv.cleanSummary();
        riv.ajaxCall( url, riv.buildInteractionsPanel );
    };

    // Toggle the left interactions panel and update the width
    riv.toggleLeftPanel = function( e ) {
        let $elLeftPanel = $( '.rna-transcriptions-container' ),
            $elBothGenes = $( '.both-genes' ),
            $elFirstGene = $( '.first-gene' ),
            $elSecondGene = $( '.second-gene' );
        if ( $elLeftPanel.is(":visible") ) {
            $elLeftPanel.hide();
            $elBothGenes.css( "width", "100%" );
            $elFirstGene.css( "width", "50%" );
            $elSecondGene.css( "width", "50%" );
        } else {
            $elLeftPanel.show();
            $elBothGenes.css( "width", "78%" );
            $elFirstGene.css( "width", "39%" );
            $elSecondGene.css( "width", "39%" );
        }
    };

    /** Reload the visualizer */
    riv.resetFilters = function( e ) {
        riv.setToDefaults();
        riv.loadData( riv.configObject );
    };

    /** Select all the interactions in the left panel */
    riv.checkAllInteractions = function( e ) {
        let $elInteractionsChecked = $( '.rna-interaction' ),
            checkallStatus = e.target.checked;
        _.each( $elInteractionsChecked, function( item ) {
            item.checked = checkallStatus ? true : false;
        });
    };

    /** Prepare url for searching taking multiple columns from the database table */
    riv.makeSearchURL = function() {
        let searchQuery = $( '.search-gene' ).val(),
            filterOperator = $( '.filter-operator' ).find( ":selected" ).val(),
            filterType = $( '.rna-filter' ).find( ":selected" ).val(),
            filterQuery = $( '.filter-value' ).val(),
            sortByVal = $( '.rna-sort' ).find( ":selected" ).val(),
            colNames = {},
            dbQuery = "",
            url = "",
            searchClause = "",
            filterClause = "",
            sortClause = "",
            tableName = riv.configObject.tableNames[ "name" ],
            isSearchQuery = false;
        dbQuery = "SELECT * FROM " + tableName;
        if( filterType !== "-1" ) {
            filterClause = tableName + "." + "score" + " " + filterOperator + " " + filterQuery;
        }
        else {
            filterClause = tableName + "." + "score BETWEEN 0.0 AND 1.0";
        }
        
        if( sortByVal !== "-1" ) {
            sortByVal = sortByVal.split( "_" );
            sortClause = " ORDER BY " + tableName + "." + sortByVal[ 0 ] + " " + sortByVal[ 1 ].toUpperCase();
        }
        else {
            sortClause = " ORDER BY " + tableName + ".score DESC";
        }
        
        if( searchQuery.length > riv.minQueryLength ) {
            let queryLike = "%" + searchQuery + "%",
                colNames = { "txid1": queryLike, "txid2": queryLike, "geneid1": queryLike,
                    "geneid2": queryLike, "symbol1": queryLike, "symbol2": queryLike,
                    "type1": queryLike, "type2": queryLike },
                colsNum = Object.keys( colNames ).length,
                colsCounter = 0;
            for( let item in colNames ) {
                searchClause += tableName + "." + item + " LIKE " + "'" + colNames[ item ] + "'";
                if( colsCounter < colsNum - 1 ) {
                    searchClause += " OR ";
                }
                colsCounter++;
            }
            isSearchQuery = true;
        }
        
        if( isSearchQuery === true  ) {
            dbQuery += " WHERE " + "(" + filterClause + ") AND (" + searchClause + ")" + sortClause;
        }
        else {
            dbQuery += " WHERE " + filterClause + sortClause;
        }
        dbQuery = "&query=" + dbQuery;
        url = riv.formUrl( riv.configObject, dbQuery );
        return url;
    };

    /** Callback event for exporting data using export button */ 
    riv.createExportData = function( records ) {
        let inte_records = [],
            tsv_data = null,
            data = records.data,
            link = document.createElement( 'a' ),
            file_name = Date.now().toString( 16 ) + '_results.tsv';
        // add headers to the tsv file
        tsv_data = riv.modelHeaders.join( "\t" ) + "\n";
        data = data.slice( 1, records.length );
        _.each( data, function( item ) {
            tsv_data = tsv_data + item.join( "\t" ) + "\n";
        });

        tsv_data = window.encodeURIComponent( tsv_data );
        link.setAttribute( 'href', 'data:application/octet-stream,' + tsv_data );
        link.setAttribute( 'download', file_name );
        document.body.appendChild( link );
        linkClick = link.click();
        riv.$elLoader.hide()
    };

    /** Slice off the first row containing table headers */
    riv.createSummaryDB = function( summaryItems ) {
        let records = summaryItems.data,
            symbol1Coll = [],
            symbol2Coll = [];
        records = records.slice( 1, records.length );
        riv.createSummary( records );
        _.each( records, function( item ) {
            symbol1Coll.push( item[ 6 ] );
            symbol2Coll.push( item[ 7 ] );
        });
        riv.createGeneNetworkInfo( records, { "symbol1": symbol1Coll, "symbol2": symbol2Coll } );
    };
    
    /** Compute clusters for the left alignment */
    riv.computeClusters = function( records ) {
        let data = records.data ? records.data : records,
            structs = [],
            structsBinary = [],
            maxLen = 0,
            padVal = -5,
            numClusters = 3,
            iterations = 25,
            clusters = null,
            centroids = [],
            clusterPoints = [];
        // empty the placeholders for heatmaps
        $( "#rna-alignment-cluster" ).empty();
        $( "#rna-alignment-cluster-points" ).empty();
        _.each( data, function( item ) {
            let leftAlignment = item[ 30 ].split( "&" )[ 0 ];
            if ( maxLen < leftAlignment.length ) {
                maxLen = leftAlignment.length;
            }
            structs.push( leftAlignment );
        });
        
        _.each( structs, function( item ) {
            let dotBrackets = item.split( "" ),
                binarySpread = [];
            for( let ctr = 0; ctr < maxLen; ctr++ ) {
                binarySpread.push( padVal );
            }
            _.each( dotBrackets, function( dB, index ) {
                if ( dB === "." ) {
                    binarySpread[ index ] = 0;
                }
                else if( dB === "(" ) {
                    binarySpread[ index ] = 5;
                }
            });
            structsBinary.push( binarySpread );
        });
        kMeansClustering.k( numClusters );
        kMeansClustering.iterations( iterations );
        kMeansClustering.data( structsBinary );
        clusters = kMeansClustering.clusters();
        _.each( clusters, function( cluster ) {
            centroids.push( cluster.centroid );
            _.each( cluster.points, function( point ) {
                clusterPoints.push( point );
            });
        });
        riv.plotHeatmap( "rna-alignment-cluster", centroids, "Heatmap for cluster centroids using kmeans", "Clusters" );
        riv.plotHeatmap( "rna-alignment-cluster-points", clusterPoints, "Heatmap for cluster points using kmeans", "Cluster points" );
    };

    /** Plot heatmap for clusters */
    riv.plotHeatmap = function( plotContainer, clusterData, title, yTitle ) {
        let trace = {
               z: clusterData,
	       type: 'heatmap',
            },
            layout = {
                autosize: true,
                margin: {
                    autoexpand: true
                },
                title: title,
                xaxis: {
                    title: "Nucleotides positions"
                },
                yaxis: {
                    title: yTitle
                },
            };
	Plotly.newPlot( plotContainer, [ trace ] , layout );
    };

    /** Create summary plots */ 
    riv.createSummary = function( summaryItems ) {
        let summaryResultType2 = {},
            summaryResultScore = [],
            summaryResultScore1 = [],
            summaryResultScore2 = [],
            summaryResultEnergy = [],
            summaryResultAlignment1 = [],
            summaryResultAlignment2 = [],
            summaryResultGeneExpr1 = [],
            summaryResultGeneExpr2 = [],
            summaryResultSymbol1 = [];
            
        riv.computeClusters( summaryItems );
        // summary fields - geneid (1 and 2) and type (1 and 2)
        _.each( summaryItems, function( item ) {

            summaryResultType2[ item[ 9 ] ] = ( summaryResultType2[ item[ 9 ] ] || 0 ) + 1;
            summaryResultScore1.push( item[ 26 ] );
            summaryResultScore2.push( item[ 27 ] );
            summaryResultScore.push( item[ 28 ] );
            summaryResultEnergy.push( item[ 32 ] );
            summaryResultGeneExpr1.push( item[ 24 ] );
            summaryResultGeneExpr2.push( item[ 25 ] );
            summaryResultSymbol1[ item[ 6 ] ] = ( summaryResultSymbol1[ item[ 6 ] ] || 0 ) + 1;

            // select only unique gene ids
            let presentGene1 = _.findWhere( summaryResultAlignment1, { geneid: item[ 4 ] } );
            if( !presentGene1 ) {
                summaryResultAlignment1.push({
                    startPos: item[ 10 ],
                    endPos: item[ 11 ],
                    seqLength: item[ 12 ],
                    geneid: item[ 4 ],
                    symbol: item[ 6 ]
                });
            }
            let presentGene2 = _.findWhere( summaryResultAlignment2, { geneid: item[ 5 ] } );
            if( !presentGene2 ) {
                summaryResultAlignment2.push({
                    startPos: item[ 13 ],
                    endPos: item[ 14 ],
                    seqLength: item[ 15 ],
                    geneid: item[ 5 ],
                    symbol: item[ 7 ]
                });
            }
        });

        // sort the lists by symbol names
        summaryResultAlignment1 = _.sortBy( summaryResultAlignment1, 'symbol' );
        summaryResultAlignment2 = _.sortBy( summaryResultAlignment2, 'symbol' );
            
        let plottingData = {
            'family_names_count': summaryResultType2,
            'score': summaryResultScore,
            'score1': summaryResultScore1,
            'score2': summaryResultScore2,
            'energy': summaryResultEnergy,
            'rnaexpr1': summaryResultGeneExpr1,
            'rnaexpr2': summaryResultGeneExpr2,
            'symbol1': summaryResultSymbol1
        };

        // sort the lists by symbols names
        summaryResultAlignment1 = _.sortBy( summaryResultAlignment1, 'symbol' );
        summaryResultAlignment2 = _.sortBy( summaryResultAlignment2, 'symbol' );

        plottingData.symbol1 = riv.mergeFamiliesToOthers( plottingData.symbol1, summaryResultScore1.length );
        plottingData.family_names_count = riv.mergeFamiliesToOthers( plottingData.family_names_count, summaryResultScore2.length );

        riv.cleanSummary();
        let plotPromise = new Promise( function( resolve, reject ) {
            resolve( riv.plotInteractions( plottingData ) );
            resolve( riv.makeAlignmentSummary( summaryResultAlignment1, summaryResultAlignment2 ) );
        });
    };

    /** Prepare summary of interactions either from the selected ones or taken from the file */
    riv.getInteractionsSummary = function( e ) {
        e.preventDefault();
        let checkedIds = [],
            checkboxes = $( '.rna-interaction' ),
            summaryItems = [];

        riv.showHideGeneSections( true );
        _.each( checkboxes, function( item ) {
            if( item.checked ) {
                if( !checkedIds.includes( item.id ) ) {
                    checkedIds.push( item.id );
                }
            }
        });
        // if there are no checked interactions, then summary is computed over
        // server for all the interactions for that sample (or filtered interactions)
        $( '.rna-pair' ).removeClass( 'selected-item' );
        if( checkedIds.length === 0 ) {
            riv.fetchSummaryAllInteractions( e );
        }
        else { // summary for all the selected/checked ones
            _.each( checkedIds, function( id ) {
                for( let ctr = 0, len = riv.model.length; ctr < len; ctr++ ) {
                    let item = riv.model[ ctr ];
                    if ( id.toString() === item[ 0 ].toString() ) {
                        summaryItems.push( item );
                        break;
                    }
                }
            });
            riv.createSummary( summaryItems );
            riv.formQuerySummary( summaryItems );
        }
    };

    riv.formQuerySummary = function( items ) {
        let symbol1Coll = [],
            symbol2Coll = [],
            symbol1 = "",
            symbol2 = "",
            url = "",
            tableName = riv.configObject.tableNames[ "name" ],
            columnName1 = tableName + "." + "symbol1",
            columnName2 = tableName + "." + "symbol2",
            query = "";

        riv.$elLoader.show();
        _.each( items, function( item ) {
            symbol1Coll.push( item[ 6 ] );
            symbol2Coll.push( item[ 7 ] );
            if ( symbol1 === "" ) {
                symbol1 = "'" + item[ 6 ] + "'";
                symbol2 = "'" + item[ 7 ] + "'";
            }
            else {
                symbol1 += "," + "'" + item[ 6 ] + "'";
                symbol2 += "," + "'" + item[ 7 ] + "'";
            }
        });
        query = "SELECT * FROM " + tableName + " WHERE " + tableName + "." + "symbol1 IN (" + symbol1 + ") OR " + tableName + "." + "symbol2 IN (" + symbol2 + ")";
        query = "&query=" + query;
        url = riv.formUrl( riv.configObject, query );
        riv.ajaxCall( url, riv.createGeneNetworkInfo, { "query": query, "symbol1": symbol1Coll, "symbol2": symbol2Coll } );
    };

    riv.createGeneNetworkInfo = function( records, symList ) {
        let recordsData = records.data ? records.data.slice( 1, ) : records,
            interactions1 = [],
            interactions2 = [],
            symbol1List = symList.symbol1,
            symbol2List = symList.symbol2,
            gene1Nodes = [],
            gene2Nodes = [],
            gene1Edges = [],
            gene2Edges = [],
            $elGene1 = document.getElementById( 'gene1-network' ),
            $elGene2 = document.getElementById( 'gene2-network' );
            
        _.each( recordsData, function( item ) {
             let symbol1 = item[ 6 ],
                 symbol2 = item[ 7 ];

             if ( symbol1List.includes( symbol1 ) ) {
                 interactions1.push( item );
             }

             if ( symbol2List.includes( symbol2 ) ) {
                 interactions2.push( item );
             }
        });
        
        _.each( interactions1, function( item ) {
            gene1Nodes.push({ data: { id: item[ 6 ] } });
            gene1Nodes.push({ data: { id: item[ 7 ] } });
            gene1Edges.push({ data: { source: item[ 6 ] , target: item[ 7 ] }});
        });

        _.each( interactions2, function( item ) {
            gene2Nodes.push({ data: { id: item[ 7 ] } });
            gene2Nodes.push({ data: { id: item[ 6 ] } });
            gene2Edges.push({ data: { source: item[ 7 ] , target: item[ 6 ] }});
        });

        cytoscapePromise = new Promise( function( resolve, reject ) {
            resolve( riv.makeCytoGraph( { elem: $elGene1, nodes: gene1Nodes, edges: gene1Edges, symbol: symbol1List } ) );
            resolve( riv.makeCytoGraph( { elem: $elGene2, nodes: gene2Nodes, edges: gene2Edges, symbol: symbol2List } ) );
        });

        cytoscapePromise.then( function() {
            riv.$elLoader.hide();
        });
    };

    /** Fetch all the records from file for showing summary (with or without filter) */
    riv.fetchSummaryAllInteractions = function( e ) {
        riv.cleanSummary();
        riv.$elLoader.show();
        riv.showHideGeneSections( true );
        $( '#rna-score' ).append( "<p class='plot-loader'>Loading plots. Please wait...</p>" );
        $( '#rna-type2' ).append( "<p class='plot-loader'>Loading plots. Please wait...</p>" );
        riv.fetchInteractionsSummaryExport( riv.createSummaryDB );
    };

    /** Select records from file with or without filters for summary and exports */
    riv.fetchInteractionsSummaryExport = function( callBack ) {
        let url = "",
            searchQuery = "",
            filterQuery = "",
            dbQuery = "",
            $elSearchGene = $( '.search-gene' ),
            $elFilterValue = $( '.filter-value' );
        // take into account if the filters are active while fetching 
        // summary data and build url accordingly
        searchQuery = $elSearchGene.val();
        filterQuery = $elFilterValue.val();
        url = riv.makeSearchURL();
        riv.ajaxCall( url, callBack );
    };

    /** Send data for summary plotting */
    riv.plotInteractions = function( data ) {
        let fileName = riv.configObject.tableNames[ "name" ];
        // build scrolls
        riv.createFancyScroll( "first-gene" );
        riv.createFancyScroll( "second-gene" );
        // plot the summary as pie charts and histograms
        riv.plotPieChart( data.symbol1, "rna-symbol1", 'Gene1 RNA family distribution' );
        riv.plotHistogram( data.score, "rna-score", 'Score distribution', "Score", "# Interactions" );
        riv.plotPieChart( data.family_names_count, "rna-type2", 'Gene2 RNA family distribution' );
        riv.plotHistogram( data.score1, "rna-score1", 'Score1 distribution', "Score1", "# Interactions" );
        riv.plotHistogram( data.score2, "rna-score2", 'Score2 distribution', "Score2", "# Interactions" );
        riv.plotBar( data.energy, "rna-energy", 'Energy distribution', 'Energy (kcal/mol)', "# Interactions" );
        riv.plotHistogram( data.rnaexpr1, "rna-expr1", 'Gene1 expression distribution', 'Gene1 Expression', "# Interactions" );
        riv.plotHistogram( data.rnaexpr2, "rna-expr2", 'Gene2 expression distribution', 'Gene2 Expression', "# Interactions" );
    };

    /** Plot pie chart for interactions chosen for summary */
    riv.plotPieChart = function( dict, container, name ) {
        let layout = {
            title: name,
            autosize: true,
            margin: {
                autoexpand: true
            }
        },
        labels = [],
        values = [];

        _.mapObject( dict, function( value, key ) {
            labels.push( key );
            values.push( value ); 
        });

        let data = [{
            values: values,
            labels: labels,
            type: 'pie',
            showlegend: true
        }];

        Plotly.newPlot( container, data, layout );
        window.onresize = function () {
            Plotly.Plots.resize( container );
        };
    };

    /** Plot histogram for interactions chosen for summary */
    riv.plotHistogram = function( data, container, name, xTitle, yTitle ) {
	let trace = {
	    x: data,
	    type: 'histogram',
        }, 
        layout = {
            autosize: true,
            margin: {
                autoexpand: true
            },
            title: name,
            xaxis: {
                title: xTitle
            },
            yaxis: {
                title: yTitle
            },
        }; 
        let plot_data = [ trace ];
	Plotly.newPlot( container, plot_data, layout );
	window.onresize = function () {
            Plotly.Plots.resize( container );
        };
    };

    /** Plot bar for interactions chosen for summary */
    riv.plotBar = function( data, container, name, xTitle, yTitle ) {
	let trace = [
            {
                x: data,
	        type: 'bar'
            }
        ], 
        layout = {
            autosize: true,
            margin: {
                autoexpand: true
            },
            title: name,
            xaxis: {
                title: xTitle
            },
            yaxis: {
                title: yTitle
            },
        };
	Plotly.newPlot( container, trace, layout );
	window.onresize = function () {
            Plotly.Plots.resize( container );
        };
    };

    /** Make alignment graphics summary for all checked items*/
    riv.makeAlignmentSummary = function( alignment1, alignment2 ) {
        let scale = 100,
            ratio = 0,
            scaledBegin = 0,
            scaledEnd = 0,
            barLength = 0,
            template1 = "",
            template2 = "";

        $( '#rna-alignment-graphics1' ).empty();
        $( '#rna-alignment-graphics2' ).empty();
        $( '#rna-alignment-graphics1' ).append( "<p>Alignment positions for " + alignment1.length + " interactions on gene1<p>" );
        $( '#rna-alignment-graphics2' ).append( "<p>Alignment positions for " + alignment2.length + " interactions on gene2<p>" );

        template1 = riv.buildSVGgraphics( alignment1, 'gene1' );
        $( '#rna-alignment-graphics1' ).append( template1 );

        template2 = riv.buildSVGgraphics( alignment2, 'gene2' );
        $( '#rna-alignment-graphics2' ).append( template2 );
    };

    /** Build SVG graphics  */
    riv.buildSVGgraphics = function( alignmentCollection, geneType ) {
        let tableTemplate = "",
            scale = 100,
            heightDiff = 8,
            alignmentHeight = 30,
            svgHeight = alignmentCollection.length * alignmentHeight,
            xOffset = 10,
            yOffset = 2,
            seqLengthXPos = 160,
            symbolXPos = 200,
            symbolSearchUrl = "";

        tableTemplate = '<div><svg height="'+ svgHeight +'" width="500">';
        _.each( alignmentCollection, function( item, index ) {
            seq1Scale = item.seqLength < scale ? item.seqLength : scale;
            ratio = scale / item.seqLength,
            scaledBegin = parseInt( ratio * item.startPos ) + xOffset,
	    scaledEnd = parseInt( ratio * item.endPos ) + xOffset,
            barLength = ( item.endPos - item.startPos ),
            seqEndPos = scaledBegin + barLength + ratio * ( item.seqLength - item.endPos );
            if( geneType === "gene1" ) {
                let geneId = item.geneid.split( "_" )[ 1 ];
                symbolSearchUrl = "https://www.ncbi.nlm.nih.gov/gene/?term=" + geneId;
            }
            else {
                symbolSearchUrl = "http://www.ensembl.org/id/" + item.geneid;
            }
            tableTemplate += '<line x1="'+ xOffset +'" y1="'+ heightDiff +'" x2="'+ scaledBegin +'" y2="'+ heightDiff +'" style="stroke:black;stroke-width:2" />' +
                '<rect x="'+ scaledBegin +'" y="'+ (heightDiff - 5) +'" width="'+ barLength +'" height="10" style="fill:green" />' +
                '<line x1="'+ (scaledBegin + barLength) +'" y1="'+ heightDiff +'" x2="'+ seqEndPos +'" y2="'+ heightDiff +'" style="stroke:black;stroke-width:2" />' +
                '<text x="'+ seqLengthXPos +'" y="'+ (heightDiff + yOffset) +'" fill="black">'+ item.seqLength +'</text>' +
                '<a xlink:href="'+ symbolSearchUrl +'" target="_blank" class="symbol-link" title="Search for this gene">' +
                    '<text x="'+ symbolXPos +'" y="'+ (heightDiff + yOffset) +'" fill="black">'+ item.symbol +'</text>' +
                '</a>';

            heightDiff += alignmentHeight;
        });
        tableTemplate += '</svg></div>';
        return tableTemplate;
    };

    /**Merge the families whose counts are very small to others category */
    riv.mergeFamiliesToOthers = function( symbolsCount, interactionsCount ) {
        let otherCategoryCount = 0,
            familiesCount = {},
            minShare = 0.01;
        for( let item in symbolsCount ) {
            let count = symbolsCount[ item ],
                share = count / interactionsCount;
            // if the overall share of any family is less than 1%, then merge all these families to "others" category
            if( share < minShare ) {
                otherCategoryCount += count;
            }
            else {
                familiesCount[ item ] = count;
            }
        }
        if ( otherCategoryCount > 0 ) {
            familiesCount[ "others" ] = otherCategoryCount;
        }
        return familiesCount;
    };

    /** Set to default values */
    riv.setToDefaults = function() {
        $( '.search-gene' )[ 0 ].value = "";
        $( '.rna-sort' ).val( "-1" );
        riv.setDefaultFilters();
        riv.cleanSummary();
    };

    /** Set the filters to their default values */
    riv.setDefaultFilters = function() {
        $( '.rna-filter' ).val( "-1" );
        $( '.filter-operator' ).val( "-1" );
        $( '.filter-value' )[ 0 ].value = "";
        $( '.rna-pair' ).remove();
        $( '.rna-interaction' ).remove();
        $( '.check-all-interactions' )[ 0 ].checked = false;
    };

    /** Create a list of interactions panel */
    riv.buildInteractionsPanel = function( records ) {
        let $elParentInteractionIds = $( ".rna-transcriptions-container" ),
            $elShowModelSizeText = $( ".sample-current-size" ),
            $elInteractionsList = null,
            sizeText = "",
            interactionsTemplate = "",
            header = null,
            interactions = null,
            configObject = riv.configObject,
            modelLength = 0,
            recordsData = records.data;

        $( '.transcriptions-ids' ).remove();
        $elShowModelSizeText.empty();
        $elParentInteractionIds.append( '<div class="transcriptions-ids"></div>' );
        $elInteractionsList = $( ".transcriptions-ids" );

        if ( recordsData && recordsData.length > 1 ) {
            // set the models
            riv.modelHeaders = recordsData[ 0 ];
            recordsData = recordsData.slice( 1, );
            riv.model = recordsData.slice( 0, riv.showRecords );
            modelLength = recordsData.length;
            // show how many records being shown
            if( modelLength >= riv.showRecords ) {
                sizeText = "Showing <b>" + riv.showRecords + "</b> of <b>" + modelLength + " </b>interactions";
            }
            else {
                sizeText = "Showing only <b>" + modelLength + " </b>interactions";
            }
            $elShowModelSizeText.html( sizeText );
            _.each( riv.model, function( item ) {
                interactionsTemplate = interactionsTemplate + riv.createInteractionsListTemplate( item );
            });
            $elInteractionsList.empty().append( interactionsTemplate )
            riv.createFancyScroll( 'transcriptions-ids', "transcriptions" );
            riv.registerEventsInteractions();
        }
        else {
           $elInteractionsList.html( "<div> No results found. </div>" );
        }     
        $elInteractionsList.show();
        riv.$elLoader.hide();
    };

    /** Register events for the items in the interactions list */
    riv.registerEventsInteractions = function() {
        let $elRNAPair = $( '.rna-pair' );

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
            let interactionId = "",
                records = riv.model;
            if ( e.target.tagName !== "INPUT" ) {
                if( e.target.childElementCount > 0 ) {
                    interactionId = e.target.children[ 0 ].id;
                }
                else {
                    interactionId = e.target.parentElement.children[ 0 ].id;
                }
                $elRNAPair.removeClass( 'selected-item' );
                for( let ctr = 0, len = records.length; ctr < len; ctr++ ) {
                    let item = records[ ctr ];
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
        let $elBothGenes = $( ".both-genes" ),
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
        $elBothGenes.append( riv.createAlignmentTemplate( alignment, energyExpr, item[ 0 ] ) );

        $elBothGenes.append( "<div class='interaction-header'>Genes Information </div>" );
        $elBothGenes.append( riv.createSelectedPairInformation( item, "info-gene1", 0 ) );
        $elBothGenes.append( riv.createSelectedPairInformation( item, "info-gene2", 1 ) );

        riv.createFancyScroll( "single-interactions-info" );
        riv.buildAligmentGraphics( item );

        // event for downloading alignment as text file
        $( '.download-alignment' ).off( 'click' ).on( 'click', function( e ) {
            e.preventDefault();
            e.stopPropagation();
            let rowId = e.target.attributes[ "data-id" ].value;
            riv.exportAlignment( rowId );
        });
    };

    /** Export alignment */
    riv.exportAlignment = function( rowId ) {
        let link = document.createElement( 'a' ),
            downloadData = "";
        for( let ctr = 0, len = riv.model.length; ctr < len; ctr++ ) {
            let item = riv.model[ ctr ];
            if ( item[ 0 ].toString() === rowId.toString() ) {
                let sequence = item[ 29 ];
                sequence = sequence.split( "&" );
                if ( sequence.length > 1 ) {
                    downloadData = "Sequence 1: " + sequence[ 0 ] + "\n";
                    downloadData += "Sequence 2: " + sequence[ 1 ] + "\n";
                    downloadData += "Alignment energy: " + item[ 32 ] + " kcal/mol " + "\n";
                }
                else {
                   downloadData = "No sequences available \n";
                }
                break;
            }
        }
        downloadData += "Alignment: " + $( '.pre-align' ).text();
        let encodedData = window.encodeURIComponent( downloadData );
        link.setAttribute( 'href', 'data:application/octet-stream,' + encodedData );
        link.setAttribute( 'download', Date.now().toString( 16 ) + '_seq_alignment.txt' );
        document.body.appendChild( link );
        linkClick = link.click();
    };

    /** Draw graphics for alignment */
    riv.buildAligmentGraphics = function( item ) {
        let dataGene = {};
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
        let scale = data.seqLength < data.scale ? data.seqLength : data.scale,
            ratio = scale / data.seqLength,
            xOffset = 10,
            scaledBegin = parseInt( ratio * data.startPos ) + xOffset,
	    scaledEnd = parseInt( ratio * data.endPos ) + xOffset,
            heightDiff = 20,
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
        let sequences = sequenceInfo.sequences;
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
        for( let dotbrac1Ctr = 0; dotbrac1Ctr < dotbracket1Length; dotbrac1Ctr++ ) {
            if ( dotbracket1[ dotbrac1Ctr ] === '(' ) {
                let alignPos = [];
                alignPos.push( dotbrac1Ctr + 1 );
                dotbracket1[ dotbrac1Ctr ] = ".";
                for( let dotbrac2Ctr = dotbracket2Length - 1; dotbrac2Ctr >= 0; dotbrac2Ctr-- ) {
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

    /** Construct database query using table name and clauses */
    riv.constructQuery = function( tableName, conditionValueDict={}, equalityOp="=", joinCondition="", orderByCol="score", orderByDirection="DESC" ) {
        let query = "&query=",
            colsNum = Object.keys( conditionValueDict ).length;
        query = query + "SELECT * FROM " + tableName;
        if( Object.keys( conditionValueDict ) && Object.keys( conditionValueDict ).length > 0 ) {
            query = query + " WHERE ";
            let colsCounter = 0;
            for( let item in conditionValueDict ) {
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
        let colNames = { "symbol1": item[ 6 ], "symbol2": item[ 7 ] },
            query = "", url = "";
        query = riv.constructQuery( riv.configObject.tableNames[ "name" ], colNames, "=","OR" );
        url = riv.formUrl( riv.configObject, query );
        riv.configObject.symbol1 = item[ 6 ];
        riv.configObject.symbol2 = item[ 7 ];
        riv.ajaxCall( url, riv.separateInteractions, riv.configObject );
    };

    /** Separate the records based on geneids for creating two cytoscape graphs */
    riv.separateInteractions = function( records, configObject ) {
        let data = records.data,
            gene1InteractionsUnpacked = [],
            gene2InteractionsUnpacked = [];
        graphData = data.slice( 1, data.length );
        riv.buildCytoscapeGraphData( graphData, configObject );
    };
    
    /** Create data for building cytoscape graphs */
    riv.buildCytoscapeGraphData = function( interactions, configObject ) {
        let $elGene1 = document.getElementById( 'interaction-graph-1' ),
            $elGene2 = document.getElementById( 'interaction-graph-2' ),
            gene1Nodes = [],
            gene2Nodes = [],
            gene1Edges = [],
            gene2Edges = [],
            cytoscapePromise = null,
            scores1 = [],
            scores2 = [],
            maxScore1 = 0,
            maxScore2 = 0,
            geneExpr1 = [],
            maxGeneExpr1 = 0,
            geneExpr2 = [],
            maxGeneExpr2 = 0,
            graphLoadErrorMessage = "Unable to load graph...",
            interactions1 = [],
            interactions2 = [],
            source1 = null,
            source2 = null;

        _.each( interactions, function( item ) {
             if ( item[ 6 ] === configObject.symbol1 ) {
                 interactions1.push( item );
             }

             if ( item[ 7 ] === configObject.symbol2 ) {
                 interactions2.push( item );
             }
        });

        if ( interactions1 && interactions1.length > 0 ) {
            // define expressions for weighing the edges and nodes of the graphs
            scores1 = interactions1.map( function( row ) { return row[ 28 ] } )
            maxScore1 = scores1.reduce( function( a, b ) { return Math.max( a, b ) } );
            maxScore1 = ( maxScore1 === 0 ) ? 1 : maxScore1;

            geneExpr1 = interactions1.map( function( row ) { return row[ 25 ] } );
            maxGeneExpr1 = geneExpr1.reduce( function( a, b ) { return Math.max( a, b ) } );
            maxGeneExpr1 = ( maxGeneExpr1 === 0 ) ? 1 : maxGeneExpr1;

            source1 = interactions1[ 0 ][ 6 ];
            gene1Nodes.push({ data: { id: source1 }});
            
            _.each( interactions1, function( item ) {
                gene1Nodes.push({ data: { id: item[ 7 ], weight: ( item[ 25 ] / maxGeneExpr1 ) } });
                gene1Edges.push({ data: { source: source1, target: item[ 7 ], weight: ( item[ 28 ] / maxScore1 ) }});
            });

            // make call to cytoscape to generate graphs
            cytoscapePromise = new Promise( function( resolve, reject ) {
                resolve( riv.makeCytoGraph( { elem: $elGene1, nodes: gene1Nodes, edges: gene1Edges, symbol: [ configObject.symbol1 ] } ) );
            });
        }
        else {
            $( $elGene1 ).html( "<p class='graph-error'>" + graphLoadErrorMessage + "</p>" );
            riv.$elLoader.hide();
        }

        if ( interactions2 && interactions2.length > 0 ) {
            // define expressions for weighing the edges and nodes of the graphs
            scores2 = interactions2.map( function( row ) { return row[ 28 ] } )
            maxScore2 = scores2.reduce( function( a, b ) { return Math.max( a, b ) } );
            maxScore2 = ( maxScore2 === 0 ) ? 1 : maxScore2;

            geneExpr2 = interactions2.map( function( row ) { return row[ 24 ] } );
            maxGeneExpr2 = geneExpr2.reduce( function( a, b ) { return Math.max( a, b ) } );
            maxGeneExpr2 = ( maxGeneExpr2 === 0 ) ? 1 : maxGeneExpr2;

            source2 = interactions2[ 0 ][ 7 ];
            gene2Nodes.push({ data: { id: source2 }});
            
            _.each( interactions2, function( item ) {
                gene2Nodes.push({ data: { id: item[ 6 ], weight: ( item[ 24 ] / maxGeneExpr2 ) } });
                gene2Edges.push({ data: { source: source2, target: item[ 6 ], weight: ( item[ 28 ] / maxScore2 ) }});
            });

            // make call to cytoscape to generate graphs
            cytoscapePromise = new Promise( function( resolve, reject ) {
                resolve( riv.makeCytoGraph( { elem: $elGene2, nodes: gene2Nodes, edges: gene2Edges, symbol: [ configObject.symbol2 ] } ) );
            });
            
        }
        else {
            $( $elGene2 ).html( "<p class='graph-error'>" + graphLoadErrorMessage + "</p>" );
            riv.$elLoader.hide();
        }
        
        cytoscapePromise.then(function() {
            riv.$elLoader.hide();
        });
    };

    /** Create cytoscape graph */
    riv.makeCytoGraph = function( data ) {
        let graph = null;
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

        // color the source node differently
        _.each( data.symbol, function( item ) {
            let $graphElem = graph.$( "#" + item );
            $graphElem.style( "backgroundColor","green" );
        });

        // when a node is tapped, make a search with the node's text
        graph.on( 'tap', 'node', function( ev ) {
            let query = this.id(),
                conf = window.confirm( "Do you want to make a search for geneid - " + query );
            if ( conf && conf === true ) {
                riv.ajaxCall( riv.makeSearchURL(), riv.buildInteractionsPanel );
                riv.setDefaultFilters();
                riv.cleanSummary();
                $( ".search-gene" ).val( query );
            }
            else {
                return false;
            }
        });

        $( window ).resize(function( e ) {
            e.preventDefault();
            graph.resize();
        });
        $( ".graph-size" ).show();
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
    };

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
        $( "#gene1-network" ).empty();
        $( "#gene2-network" ).empty();
    };

    /** Load sqlite dataset records on first load of the visualization */
    riv.loadData = function( configObject ) {
        let query = '&query=SELECT * FROM ' + configObject.tableNames[ "name" ],
            urlValue = riv.formUrl( configObject, query );
        riv.configObject = configObject;
        riv.$elLoader.show();
        riv.ajaxCall( urlValue, riv.createUI, configObject );
    };

    /** Create fancy scrollbars */
    riv.createFancyScroll = function ( className, type ) {
        $( '.' + className ).mCustomScrollbar({
            theme:"minimal",
            scrollInertia: 5,
            axis:"yx",
            mouseWheel: { enable: ( type ) ? true : false }
        });
        $( '.' + className + ' .mCSB_dragger_bar' ).css( 'background-color', 'black' );
    };

    riv.createSelectedPairInformation = function( item, id, filePos ) {
        let svgTitle = filePos == 1 ? "Gene aligning positions. The sequence as well as alignment length is scaled to 100 pixels" : "Gene aligning positions",
            geneExpr = parseFloat( item[ 24 + filePos ] ),
            score = parseFloat( item[ 26 + filePos ] );
        geneExpr = geneExpr.toFixed( 2 );
        score = score.toFixed( 4 );
        
        return '<span id="'+ id +'" class="single-interactions-info">' +
	           '<p><b>Geneid</b>: ' + item[ 4 + filePos ] + '</p>' +
	           '<p><b>Symbol</b>: ' + item[ 6 + filePos ] + '</p>' +
	           '<p><b>Type</b>: ' + item[ 8 + filePos ] + '</p>' +
                   '<p><b>Gene Expression </b>: ' + geneExpr + ' Transcripts Per Kilobase Million (TPM)</p>' +
	           '<p><b>Score'+ ( filePos + 1) + '</b>: ' + score + '</p>' +
                   '<p><b>Gene Aligning Positions:</b></p><svg height="50" width="300" id="align-pos-'+ ( filePos + 1) +'" title="'+ svgTitle +'"></svg>' +
                   '<p><b>Gene Interactions Network:</b></p><div id=interaction-graph-'+ (filePos + 1) +' class="graph-size"></div>' +
	        '</span>';
    },

    riv.createAlignmentTemplate = function( alignment, energyExpr, id ) {
        return "<div class='interaction-header'>Alignment Information" +
                   "<a data-id='"+ id +"' href='#' class='download-alignment' title='Download the alignment as text file'>" +
                   "Download alignment</a></div><span class='alignment-energy' title='Gibbs free energy'>" + energyExpr + "</span>" +
                   "<div class='seq-alignment' title='Sequence alignment'><pre class='pre-align'>" + alignment + "</pre>" +
               "</div>";
    };

    riv.createInteractionsListTemplate = function( record ) {
        return '<div class="rna-pair"><input type="checkbox" id="'+ record[ 0 ] +'" value="" class="rna-interaction" />' +
                   '<span class="rna-pair-interaction">' + record[ 6 ] + '-' + record[ 7 ]  + '</span>' +
               '</div>';
    }; 

    riv.createInteractionTemplate = function() {
        return '<div class="container one-sample">' +
                   '<div class="row top-row">' +
                       '<div class="col-sm-2 elem-rna">' +
                           '<div class="sample-name" title="'+riv.configObject.dataName+'">'+ riv.configObject.dataName.substring(0, 20) + '...' +'</div>' +
                           '<div class="sample-current-size"></div>' +
                       '</div>' +
                       '<div class="col-sm-2 elem-rna search-input">' +
                           '<input type="text" class="search-gene form-control elem-rna" value="" placeholder="Search..." title="Search">' +
                           '<img class="search-gene-image" src="/static/plugins/visualizations/chiraviz/static/images/search-icon.png" width=20 />' +
                       '</div>' +
                       '<div class="col-sm-2 elem-rna">' +
                           '<select name="sort" class="rna-sort elem-rna form-control elem-rna" title="Sort">' +
                               '<option value="-1">Sort by...</option>' +
	                       '<option value="score_asc">Score asc</option>' +
	                       '<option value="score_desc">Score desc</option>' +
                               '<option value="energy_asc">Energy asc</option>' +
                               '<option value="energy_desc">Energy desc</option>' +
                           '</select>' +
                       '</div>' +
                       '<div class="col-sm-2 elem-rna">' +
	                   '<select name="filter" class="rna-filter form-control elem-rna" title="Filter">' +
		               '<option value="-1">Filter by...</option>' +
		               '<option value="score">Score</option>' +
		               //'<option value="family">RNA Family</option>' +
	                   '</select>' +
                        '</div>' +
                        '<div class="col-sm-2 elem-rna">' +
                           '<select name="filter-operator" class="filter-operator form-control elem-rna" title="Filter operator">' +
        	               '<option value="-1">Choose operator...</option>' +
	                       '<option value="=">=</option>' +
	                       '<option value=">">></option>' +
                               '<option value="<"><</option>' +
                               '<option value="<="><=</option>' +
                               '<option value=">=">>=</option>' +
                               '<option value="<>"><></option>' +
                           '</select>' +
                        '</div>' +
                        '<div class="col-sm-2 elem-rna search-input">' +
                         '<input type="text" class="filter-value form-control elem-rna" title="Enter the selected filter value"' +
                             'value="" placeholder="Enter value..." />' +
                         '<img class="filter-value-image" src="/static/plugins/visualizations/chiraviz/static/images/search-icon.png" width=20 />' +
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
                           '<div id="rna-alignment-cluster"></div>' +
                           '<div id="rna-alignment-cluster-points"></div>' +
                           '<div id="gene1-network" class="graph-size"></div>' +
                       '</div>' +
                       '<div class="col-sm-5 second-gene">' +
                           '<div id="rna-type2"></div>' +
                           '<div id="rna-score2"></div>' +
                           '<div id="rna-expr2"></div>' +
                           '<div id="rna-alignment-graphics2"></div>' +
                           '<div id="gene2-network" class="graph-size"></div>' +
                       '</div>' +
                   '</div>' +
                   '<div class="row footer-row">' +
                       '<div class="col-sm-10">' +
                           '<input id="check_all_interactions" type="checkbox" class="check-all-interactions"' +
                               'value="false" title="Check all displayed interactions" />' +
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
			      'Reload' +
		           '</button>' +
                           '<button type="button" class="toggle-left btn btn-primary btn-rna btn-interaction"' +
                                  'title="Toggle left panel">' +
			      'Toggle left panel' +
		           '</button>' +
                       '</div>' +
                       '<div class="col-sm-2"></div>' +
                   '</div>' +
               '</div>';

    };

    return riv;
}( RNAInteractionViewer || {} ) );

