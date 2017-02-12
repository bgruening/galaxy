/**
    This is the base class of the tool form plugin. This class is e.g. inherited by the regular and the workflow tool form.
*/
define( [ 'utils/utils', 'utils/deferred', 'mvc/ui/ui-misc', 'mvc/form/form-view', 'mvc/citation/citation-model', 'mvc/citation/citation-view' ],
    function( Utils, Deferred, Ui, FormBase, CitationModel, CitationView ) {
    return FormBase.extend({
        initialize: function( options ) {
            var self = this;
            this.deferred = new Deferred();
            FormBase.prototype.initialize.call( this, options );
            if ( this.model.get( 'inputs' ) ) {
                this._buildForm( this.model.attributes );
            } else {
                this.deferred.execute( function( process ) {
                    self._buildModel( process, self.model.attributes, true );
                });
            }
            // listen to history panel
            if ( this.model.get( 'listen_to_history' ) && parent.Galaxy && parent.Galaxy.currHistoryPanel ) {
                this.listenTo( parent.Galaxy.currHistoryPanel.collection, 'change', function() {
                    self.model.get( 'onchange' )();
                });
            }
            // destroy dom elements
            this.$el.on( 'remove', function() { self.remove() } );
        },

        /** Wait for deferred build processes before removal */
        remove: function() {
            var self = this;
            this.$el.hide();
            this.deferred.execute( function() {
                FormBase.prototype.remove.call( self );
                Galaxy.emit.debug( 'tool-form-base::remove()', 'Destroy view.' );
            });
        },

        /** Build form */
        _buildForm: function( options ) {
            var self = this;
            this.model.set( options );
            this.model.set({
                title       : '<b>' + options.name + '</b> ' + options.description + ' (Galaxy Version ' + options.version + ')',
                operations  : !this.model.get( 'hide_operations' ) && this._operations(),
                onchange    : function() {
                    self.deferred.reset();
                    self.deferred.execute( function ( process ) {
                        self.model.get( 'postchange' )( process, self );
                    });
                }
            });
            this.model.get( 'customize' ) && this.model.get( 'customize' )( this );
            this.render();
            if ( !this.model.get( 'collapsible' ) ) {
                this.$el.append( $( '<div/>' ).addClass( 'ui-margin-top-large' ).append( this._footer() ) );
            }
        },

        /** Builds a new model through api call and recreates the entire form */
        _buildModel: function( process, new_options, hide_message ) {
            var self = this;
            var options = this.model.attributes;
            options.version = new_options.version;
            options.id = new_options.id;

            // build request url
            var build_url = '';
            var build_data = {};
            if ( options.job_id ) {
                build_url = Galaxy.root + 'api/jobs/' + options.job_id + '/build_for_rerun';
            } else {
                build_url = Galaxy.root + 'api/tools/' + options.id + '/build';
                if ( Galaxy.params && Galaxy.params.tool_id == options.id ) {
                    build_data = $.extend( {}, Galaxy.params );
                    options.version && ( build_data[ 'tool_version' ] = options.version );
                }
            }

            // get initial model
            Utils.get({
                url     : build_url,
                data    : build_data,
                success : function( data ) {
                    if( !data.display ) {
                        window.location = Galaxy.root;
                        return;
                    }
                    self._buildForm( data );
                    !hide_message && self.message.update({
                        status      : 'success',
                        message     : 'Now you are using \'' + options.name + '\' version ' + options.version + ', id \'' + options.id + '\'.',
                        persistent  : false
                    });
                    Galaxy.emit.debug('tool-form-base::_buildModel()', 'Initial tool model ready.', data);
                    process.resolve();
                },
                error   : function( response, status ) {
                    var error_message = ( response && response.err_msg ) || 'Uncaught error.';
                    if ( status == 401 ) {
                        window.location = Galaxy.root + 'user/login?' + $.param({ redirect : Galaxy.root + '?tool_id=' + options.id });
                    } else if ( self.$el.is( ':empty' ) ) {
                        self.$el.prepend( ( new Ui.Message({
                            message     : error_message,
                            status      : 'danger',
                            persistent  : true,
                            large       : true
                        }) ).$el );
                    } else {
                        Galaxy.modal && Galaxy.modal.show({
                            title   : 'Tool request failed',
                            body    : error_message,
                            buttons : {
                                'Close' : function() {
                                    Galaxy.modal.hide();
                                }
                            }
                        });
                    }
                    Galaxy.emit.debug( 'tool-form-base::_buildModel()', 'Initial tool model request failed.', response );
                    process.reject();
                }
            });
        },

        /** Create tool operation menu */
        _operations: function() {
            var self = this;
            var options = this.model.attributes;

            // button for version selection
            var versions_button = new Ui.ButtonMenu({
                icon    : 'fa-cubes',
                title   : (!options.narrow && 'Versions') || null,
                tooltip : 'Select another tool version'
            });
            if (!options.sustain_version && options.versions && options.versions.length > 1) {
                for (var i in options.versions) {
                    var version = options.versions[i];
                    if (version != options.version) {
                        versions_button.addMenu({
                            title   : 'Switch to ' + version,
                            version : version,
                            icon    : 'fa-cube',
                            onclick : function() {
                                // here we update the tool version (some tools encode the version also in the id)
                                var id = options.id.replace(options.version, this.version);
                                var version = this.version;
                                // queue model request
                                self.deferred.reset();
                                self.deferred.execute(function(process) {
                                    self._buildModel(process, {id: id, version: version})
                                });
                            }
                        });
                    }
                }
            } else {
                versions_button.$el.hide();
            }

            // button for options e.g. search, help
            var menu_button = new Ui.ButtonMenu({
                icon    : 'fa-caret-down',
                title   : (!options.narrow && 'Options') || null,
                tooltip : 'View available options'
            });
            if(options.biostar_url) {
                menu_button.addMenu({
                    icon    : 'fa-question-circle',
                    title   : 'Question?',
                    tooltip : 'Ask a question about this tool (Biostar)',
                    onclick : function() {
                        window.open(options.biostar_url + '/p/new/post/');
                    }
                });
                menu_button.addMenu({
                    icon    : 'fa-search',
                    title   : 'Search',
                    tooltip : 'Search help for this tool (Biostar)',
                    onclick : function() {
                        window.open(options.biostar_url + '/local/search/page/?q=' + options.name);
                    }
                });
            };
            menu_button.addMenu({
                icon    : 'fa-share',
                title   : 'Share',
                tooltip : 'Share this tool',
                onclick : function() {
                    prompt('Copy to clipboard: Ctrl+C, Enter', window.location.origin + Galaxy.root + 'root?tool_id=' + options.id);
                }
            });

            // add admin operations
            if (Galaxy.user && Galaxy.user.get('is_admin')) {
                menu_button.addMenu({
                    icon    : 'fa-download',
                    title   : 'Download',
                    tooltip : 'Download this tool',
                    onclick : function() {
                        window.location.href = Galaxy.root + 'api/tools/' + options.id + '/download';
                    }
                });
            }

            // add admin operations for tool XML reloading
            if (Galaxy.user && Galaxy.user.get('is_admin')) {
                menu_button.addMenu({
                    icon    : 'fa-refresh',
                    title   : 'Reload Tool XML',
                    tooltip : 'Reload tool XML file',
                    onclick : function() {
                        var modalMessage = new Ui.Modal.View();
                        $.ajax({
                            url: '/api/tools/' + options.id + '/reload',
                            type: "GET",
                        }).done(function(data){
                            modalMessage.show({
                                title   : data.done ? 'Tool XML Reload' : 'Tool XML Reload Error',
                                body    : data.done ? data.done : data.error,
                                buttons : { 'Close' : function() { modalMessage.hide() } }
                            });
                            window.setTimeout(function(){modalMessage.hide();}, 2000);
                        }).fail(function(error){
                            modalMessage.show({
                                title: "Tool XML Reload AJAX Error",
                                body: options.id + " " + error,
                                buttons : { 'Close' : function() { modalMessage.hide() } }
                            });
                        });
                    }
                });
            }

            // button for version selection
            if (options.requirements && options.requirements.length > 0) {
                menu_button.addMenu({
                    icon    : 'fa-info-circle',
                    title   : 'Requirements',
                    tooltip : 'Display tool requirements',
                    onclick : function() {
                        if ( !this.requirements_visible || self.portlet.collapsed ) {
                            this.requirements_visible = true;
                            self.portlet.expand();
                            self.message.update( { persistent : true, message : self._templateRequirements( options ), status : 'info' } );
                        } else {
                            this.requirements_visible = false;
                            self.message.update( { message : '' } );
                        }
                    }
                });
            }

            // add toolshed url
            if (options.sharable_url) {
                menu_button.addMenu({
                    icon    : 'fa-external-link',
                    title   : 'See in Tool Shed',
                    tooltip : 'Access the repository',
                    onclick : function() {
                        window.open(options.sharable_url);
                    }
                });
            }

            return {
                menu        : menu_button,
                versions    : versions_button
            }
        },

        /** Create footer */
        _footer: function() {
            var options = this.model.attributes;
            var $el = $( '<div/>' ).append( this._templateHelp( options ) );
            if ( options.citations ) {
                var $citations = $( '<div/>' );
                var citations = new CitationModel.ToolCitationCollection();
                citations.tool_id = options.id;
                var citation_list_view = new CitationView.CitationListView({ el: $citations, collection: citations });
                citation_list_view.render();
                citations.fetch();
                $el.append( $citations );
            }
            return $el;
        },

        /** Templates */
        _templateHelp: function( options ) {
            var $tmpl = $( '<div/>' ).addClass( 'ui-form-help' ).append( options.help );
            $tmpl.find( 'a' ).attr( 'target', '_blank' );
            return $tmpl;
        },

        _templateRequirements: function( options ) {
            var nreq = options.requirements.length;
            if ( nreq > 0 ) {
                var requirements_message = 'This tool requires ';
                _.each( options.requirements, function( req, i ) {
                    requirements_message += req.name + ( req.version ? ' (Version ' + req.version + ')' : '' ) + ( i < nreq - 2 ? ', ' : ( i == nreq - 2 ? ' and ' : '' ) );
                });
                var requirements_link = $( '<a/>' ).attr( 'target', '_blank' ).attr( 'href', 'https://wiki.galaxyproject.org/Tools/Requirements' ).text( 'here' );
                return $( '<span/>' ).append( requirements_message + '. Click ' ).append( requirements_link ).append( ' for more information.' );
            }
            return 'No requirements found.';
        }
    });
});
