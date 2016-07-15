/** Generic search feature **/
define(["mvc/tool/tool-form"], function( ToolForm) {

var GenericSearch = Backbone.View.extend({
    initialize: function ( ) {
        // renders the template
        $('.full-content').prepend( this._template() );
    },

    /** registers the events */
    render: function() {
        var self = this;
        this.removeOverlay();
        // registers the keyup event in the search textbox
        $('.txtbx-search-data').on('keyup', function( e ) { self.searchData( self, e ); });
        return this;
    },

    /** invokes the overlay */
    invokeOverlay: function( evt ) {
        var $el_search_screen = $( '.search-screen' ),
	    $el_search_screen_overlay = $( '.search-screen-overlay' ),
	    $el_search_txtbx = $( '.txtbx-search-data' ),
	    $el_search_result = $( '.search-results' );
        if( evt ) {
	    evt.stopPropagation();
	    if ( ( evt.which === 81 || evt.keyCode === 81 ) && evt.ctrlKey ) {
	        // clears the data of previous search
	        $el_search_txtbx.val( "" );
	        $el_search_result.html( "" );
	        // shows the overlay and search screen
	        $el_search_screen_overlay.css( 'display', 'block' );
	        $el_search_screen.css( 'display', 'block' );
	        $el_search_txtbx.focus();
	    }
	    // removes the overlay and hides the search screen
	    else if ( evt.which === 27 || evt.keyCode === 27 ) {
	        this.removeOverlay();
                this.resetHistorySearch();
	    }
        }
    },

    /** removes the search overlay */ 
    removeOverlay: function() {
        var $el_search_screen = $( '.search-screen' ),
            $el_search_screen_overlay = $( '.search-screen-overlay' );
        $el_search_screen_overlay.css( 'display', 'none' );
        $el_search_screen.css( 'display', 'none' );
    },

    /** resets the original history search */
    resetHistorySearch: function() {
        var $el = $( '.search-input .search-query' );
        $el.focus();
        // triggers the escape key press
        $el.trigger( $.Event( "keyup", { keyCode: 27, which: 27 } ) );
        $el.blur();
    },

    /** searches with the query */ 
    searchData: function( _self, e ) {
        var $el_search_txtbx = $( '.txtbx-search-data' ),
            query = "",
            url_root = Galaxy.root + 'api/tools',
            $el_search_result = $( '.search-results' ),
            $el_search_history_input = $( '.search-input .search-query' ),
            link = null,
            search_query_minimum_length = 3,
            search_result = null;

        if( e ) {
            e.stopPropagation();
            query = ( $el_search_txtbx.val() ).trim();
            //query = query.trim();
            if( query.length < search_query_minimum_length ) {
                $el_search_result.html("");
            }
            // performs search if enter is pressed or query length increases the minimum character length
            else if ( ( e.which === 13 || e.keyCode === 13 ) || query.length >= search_query_minimum_length ) {
                $el_search_result.html( "" );
                _self.triggerToolSearch( url_root, query, _self );
                _self.triggerHistorySearch( query );
            }
            // removes the overlay and hides the search screen
            // on clicking escape key
            else if ( e.which === 27 || e.keyCode === 27 ) {
                _self.removeOverlay();
                _self.resetHistorySearch();
            }
        }
    },

    /** asynchronous fetch call for tool search */ 
    triggerToolSearch: function( url_root, query, self ) {
        $.get( url_root, { q: query }, function ( search_result ) {
            // makes template out of the search results
            self._templateSearchlinks( search_result, self );
        }, "json" );
    },

    /** triggers history item search in the original history search */
    triggerHistorySearch: function( query ) {
        var $el = $( '.search-input .search-query' );
        $el.val( query );
        $el.trigger( $.Event("keyup", { keyCode: 13, which: 13 }) );
        $el.trigger( $.Event("keyup", { keyCode: 13, which: 13 }) );
    },

    /** opens the respective link as the modal pop up or in the center of the main screen */
    searchedToolLink: function( _self, e ) {
        var id = "",
	    form_style = "",
	    version = "", 
            $target_element = null;
        if( e ) {
	    _self.removeOverlay();
            // sets the target element as jQuery element
	    if( e.srcElement ) {
                $target_element = $( e.srcElement );
	    }
	    else if( e.target ) {
                $target_element = $( e.target );
	    }
            // fetches the properties
            id = $target_element.attr( 'data-toolid' );
            form_style = $target_element.attr( 'data-formstyle' );
            version = $target_element.attr( 'data-version' );
            // loads as modal popup
	    if( id === 'upload1' ) {
	        Galaxy.upload.show();
	    }
            // opens the link in the iframe
	    else if ( form_style === 'regular' ) {
	        var form = new ToolForm.View( { id : id, version : version } );
	        form.deferred.execute(function() {
	            Galaxy.app.display( form );
	        });
	    }
            else if ( form_style === 'special' ) {
                // redirects to url other than the Galaxy
                document.location = $target_element.attr( 'href' );
            }
        }
    },

    /** creates collection of templates of all sections and links */
    _templateSearchlinks: function( search_result, self ) {
        var $el_search_result = $( '.search-results' ),
            template_dict = [];
        for( var i = 0; i < search_result.length; i++ ) {
            var all_sections = Galaxy.toolPanel.attributes.layout.models;
            for( var j = 0; j < all_sections.length; j++ ) {
                var all_tools = all_sections[j].attributes.elems,
                    is_present = false,
                    tools_template = "",
                    section_header_id = "",
                    section_header_name = "";
                for( var k = 0; k < all_tools.length; k++ ) {
                    if( search_result[i] === all_tools[k].id ) {
                        is_present = true;
                        tools_template = tools_template + self._buildLinkTemplate( all_tools[k].attributes );
                    }
                } // end of innermost for loop
                if( is_present ) {
                    section_header_id = all_sections[j].attributes.id;
                    section_header_name = all_sections[j].attributes.name;
                    template_dict = self.appendTemplate( template_dict, section_header_id, section_header_name, tools_template );
                }
            }  // end of second level for loop        
        } // end of first level for loop

        // makes the template of the fetched sections and tools
        self.makeToolSearchResultTemplate( $el_search_result, template_dict );
    },

    /** checks if element exists in the collection */
    checkValue: function( collection, id ) {
        for( var i = 0; i < collection.length; i++ ) {
            if( id === collection[i].id ) {
                return true;
            }
        }
        return false;
    },

    /** appends the template or creates a new section */
    appendTemplate: function( collection, id, name, text ) {
        var is_present = false;
        for(var i = 0; i < collection.length; i++ ) {
            if( id === collection[i].id ) {
                collection[i].template = collection[i].template + " " + text;
                is_present = true;
            }
        }
        if(!is_present) {
            collection.push( { id: id, template: text, name: name } );
        }
        return collection;
    },

    /** builds the fetched items template using the dict */ 
    makeToolSearchResultTemplate: function( $el_search_result, collection ) {
        var header_template = "",
            self = this;
        for( var i = 0; i < collection.length; i++ ) {
            header_template = this._buildHeaderTemplate( collection[i].id, collection[i].name );
            $el_search_result.append( header_template );
            $el_search_result.append( collection[i].template );
            $el_search_result.find( "a.tool-search-link" ).click(function( e ) {
                // stops the default behaviour of anchor click
                e.preventDefault();
                self.searchedToolLink( self, e );
                self.resetHistorySearch();
            });
        }
        // jQuery slow fadeIn effect
        $el_search_result.fadeIn( 'slow' );
    },

    /** builds section header template */
    _buildHeaderTemplate: function( id, name ) {
        return "<div class='search-tool-section-name' data-id='searched_" + id + "' >" + name + "</div>";
    },

    /** builds tool link template */
    _buildLinkTemplate: function( attributes ) {
        return "<a class='tool-search-link btn btn-primary " + attributes.id + " ' href='" + attributes.link +
               "' role='button' title='" + attributes.name + " " + attributes.description +
               "' target='" + attributes.target + "' data-version='" + attributes.version +
               "' minsizehint='" + attributes.min_width +
               "' data-formstyle='" + attributes.form_style + "' data-toolid='" + attributes.id + "' >" + attributes.name + "</a>";
    },

    /** template for search overlay */
    _template: function() {
        return '<div class="overlay-wrapper">' + 
	           '<div id="search_screen_overlay" class="search-screen-overlay"></div>' +
	           '<div id="search_screen" class="search-screen">' +
	               '<input class="txtbx-search-data form-control" type="text" value="" placeholder="Type your query..." />' + 
                       '<div class="search-results"></div>' +
	           '</div>' +
               '</div>';
    }
   
});

var HistorySearch = Backbone.View.extend({

    /** gets the items for history search */
    getHistorySearchList: function( items ) {
        // removes the old history search items
        $( '.search-history' ).remove();
        $( '.history-search-link' ).remove();
        if( items.length > 0 ) {
            this.makeHistoryList( items );
        }
    },

    /** makes a template of the history items returned by search routine */
    makeHistoryList: function( history_items ) {
        var template_string = "",
            $el_search_result = $( '.search-results' ),
            self = this;
        for( var counter = 0; counter < history_items.length; counter++ ) {
            var item = history_items[counter].attributes;
            template_string = template_string + self._buildHistorySearchTemplate( item );
        }
        $el_search_result.append( self._buildHeaderTemplate( 'history', 'History' ) );
        $el_search_result.append( template_string );
        $( ".history-search-link" ).click(function( e ) {
            self.removeOverlay();
            self.resetHistorySearch();
        });
    },

    /** builds links for history searched items */
    _buildHistorySearchTemplate: function( attributes ) {
        return "<a class='history-search-link btn btn-primary " + attributes.dataset_id +
               "' href='/datasets/" + attributes.dataset_id + "/display/?preview=True" +
               "' role='button' title='" + attributes.name +
               "' target='galaxy_main'" +
               ">" + attributes.name + "</a>";
    },

    /** builds section header template */
    _buildHeaderTemplate: function( id, name ) {
        return "<div class='search-tool-section-name search-history' data-id='searched_" + id + "' >" + name + "</div>";
    },

    /** removes the search overlay */ 
    removeOverlay: function() {
        var $el_search_screen = $( '.search-screen' ),
            $el_search_screen_overlay = $( '.search-screen-overlay' );
        $el_search_screen_overlay.css( 'display', 'none' );
        $el_search_screen.css( 'display', 'none' );
    },
   
    /** resets the original history search */
    resetHistorySearch: function() {
        var $el = $( '.search-input .search-query' );
        $el.focus();
        // triggers the escape key press
        $el.trigger( $.Event( "keyup", { keyCode: 27, which: 27 } ) );
        $el.blur();
    }
});

return {
    GenericSearch  : GenericSearch,
    HistorySearch  : HistorySearch
};

});

