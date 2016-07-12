/** Generic search feature **/
define(["mvc/tool/tool-form"], function( ToolForm ) {

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
	    }
        }
    },

    /** removes the search overlay */ 
    removeOverlay: function() {
        var $el_search_screen = $('.search-screen'),
            $el_search_screen_overlay = $('.search-screen-overlay');
        $el_search_screen_overlay.css('display', 'none');
        $el_search_screen.css('display', 'none');
    },

    /** searches with the query */ 
    searchData: function( _self, e ) {
        var $el_search_txtbx = $('.txtbx-search-data'),
            query = "",
            url_root = Galaxy.root + 'api/tools',
            $el_search_result = $('.search-results'),
            link = null,
            search_query_minimum_length = 3;
        if( e ) {
            e.stopPropagation();
            query = $el_search_txtbx.val();
            query = query.trim();
            if(query.length < search_query_minimum_length) {
                $el_search_result.html("");
            }
            // performs search if enter is pressed or query length increases the minimum character length
            else if ( ( e.which === 13 || e.keyCode === 13 ) || query.length >= search_query_minimum_length ) {
                $.get( url_root, { q: query }, function ( search_result ) {
                    $el_search_result.html("");
                    _self._templateHistorySearch( query );
                    _self._templateSearchlinks( search_result, _self );
                }, "json" );
            }
            // removes the overlay and hides the search screen
            // on clicking escape key
            else if ( e.which === 27 || e.keyCode === 27 ) {
                _self.removeOverlay();
            }
        }
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
            id = $target_element.attr('data-toolid');
            form_style = $target_element.attr('data-formstyle');
            version = $target_element.attr('data-version');
            // loads as modal popup
	    if( id === 'upload1') {
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
                document.location = $target_element.attr('href');
            }
        }
    },

    /** creates collection of templates of all sections and links */
    _templateSearchlinks: function( search_result, self ) {
        var $el_search_result = $('.search-results'),
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
        self.makeSearchResultTemplate( $el_search_result, template_dict );
    },

    /** searches for items in history list */
    _templateHistorySearch: function( query ) {
        var history_items = Galaxy.currHistoryPanel.collection.models,
            template_string = "",
            $el_search_result = $('.search-results'),
            is_present = false,
            self = this;
        for(var counter = 0; counter < history_items.length; counter++) {
            var item = history_items[counter].attributes,
                name = item.name;
            name = name.toLowerCase();
            query = query.toLowerCase();
            if( name.indexOf( query ) > -1 ) {
                template_string = template_string + this._buildHistorySearchTemplate( item );
                is_present = true;
            }
        }
        // makes the history section only if a result is present
        if( is_present ) {
            $el_search_result.append( this._buildHeaderTemplate( 'history', 'History' ) );
            $el_search_result.append( template_string );
            $(".history-search-link").click(function( e ) {
                self.removeOverlay();
            });
        }
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
                collection[i].template = collection[i].template + + " " + text;
                is_present = true;
            }
        }
        if(!is_present) {
            collection.push({ id: id, template: text, name: name });
        }
        return collection;
    },

    /** builds the fetched items template using the dict */ 
    makeSearchResultTemplate: function( $el_search_result, collection ) {
        var header_template = "",
            self = this;
        for( var i = 0; i < collection.length; i++ ) {
            header_template = this._buildHeaderTemplate( collection[i].id, collection[i].name );
            $el_search_result.append( header_template );
            $el_search_result.append( collection[i].template );
            $el_search_result.find("a.tool-search-link").click(function( e ) {
                // stops the default behaviour of anchor click
                e.preventDefault();
                self.searchedToolLink( self, e );
            });
        }
        // jQuery slow fadeIn effect
        $el_search_result.fadeIn('slow');
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

    /** builds links for history searched items */
    _buildHistorySearchTemplate: function( attributes ) {
        return "<a class='history-search-link btn btn-primary " + attributes.dataset_id +
               "' href='/datasets/" + attributes.dataset_id + "/display/?preview=True" +
               "' role='button' title='" + attributes.name +
               "' target='galaxy_main'" +
               ">" + attributes.name + "</a>";
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

return {
    GenericSearch  : GenericSearch
};

});

