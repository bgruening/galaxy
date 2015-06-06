 <%namespace name="ie" file="ie.mako" />

<%
import subprocess
from galaxy.util import sockets

# Sets ID and sets up a lot of other variables
ie_request.load_deploy_config()
ie_request.attr.docker_port = 80

ie_request.get_conf_dict()

## General IE specific
# Access URLs for the notebook from within galaxy.
# http://bag:8080/?bam=http://bag:8080/tmp/bamfile.bam

params = {
    'galaxy_url': ie_request.attr.viz_config.get("docker", "galaxy_url"),
    'galaxy_port': ie_request.attr.PORT
    }
notebook_access_url = ie_request.url_template('http://%(galaxy_url)s:%(galaxy_port)s/?bam=http://%(galaxy_url)s:${PORT}/tmp/bamfile.bam' % (params))

ie_request.launch(env_override={
    'PUB_HOSTNAME': ie_request.attr.viz_config.get("docker", "galaxy_url"),
    'PUB_HTTP_PORT': ie_request.attr.PORT
    },
    volumes=[
    '%s:/input/bamfile.bam:ro' % hda.file_name,
    '%s:/input/bamfile.bam.bai:ro' % hda.metadata.bam_index.file_name
    ]
)

root = h.url_for( '/' )
%>
<html>
<head>
    ${ ie.load_default_js() }
</head>
<body>

    <script type="text/javascript">

        ${ ie.default_javascript_variables() }
        var notebook_access_url = '${ notebook_access_url }';
        ${ ie.plugin_require_config() }

        requirejs(['interactive_environments', 'plugin/bam_iobio'], function(){
            display_spinner();
        });

        toastr.info(
            "BAM io.bio is starting up!",
            "transferring data ...",
            {'closeButton': true, 'timeOut': 10000, 'tapToDismiss': false}
        );

        var startup = function(){
            // Load notebook
            requirejs(['interactive_environments', 'plugin/bam_iobio'], function(){
                load_notebook(notebook_access_url);
            });

        };
        // sleep 10 seconds
        // this is currently needed to get the vis right
        // plans exists to move this spinner into the container
        setTimeout(startup, 10000);

    </script>
<div id="main">
</div>
</body>
</html>
