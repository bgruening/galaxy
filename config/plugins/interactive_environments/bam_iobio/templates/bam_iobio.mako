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

docker_cmd = ie_request.docker_cmd( )

# Define variables for all ports that needs to be available for the iobio visualisation.
ENV_KEYS = ['PUB_HTTP_PORT', 'PUB_BAMTOOLS_PORT', 'PUB_SAMTOOLS_PORT',
    'PUB_BAMDEPTHER_PORT', 'PUB_BAMMERGER_PORT', 'PUB_BAMSTATSALIVE_PORT']

ENV = {
        'PUB_HOSTNAME': ie_request.attr.viz_config.get("docker", "galaxy_url"),
        'INPUT_BAMFILE': hda.file_name,
        'INPUT_BAMFILE_INDEX': hda.metadata.bam_index.file_name
        }

# Get for every ENV_KEYS one free port.
for key in ENV_KEYS:
    port = sockets.unused_port()
    ENV.update({key:port})

# Setting up all environment variables and mounting in
# the BAM file + index, readonly. No copying needed here.
inject = """ -p %(PUB_HTTP_PORT)s:80 \
    -p %(PUB_BAMTOOLS_PORT)s:8000 \
    -p %(PUB_SAMTOOLS_PORT)s:8001 \
    -p %(PUB_BAMDEPTHER_PORT)s:8002 \
    -p %(PUB_BAMMERGER_PORT)s:8003 \
    -p %(PUB_BAMSTATSALIVE_PORT)s:8004 \
    -e PUB_HOSTNAME=%(PUB_HOSTNAME)s \
    -e PUB_HTTP_PORT=%(PUB_HTTP_PORT)s \
    -e PUB_BAMTOOLS_PORT=%(PUB_BAMTOOLS_PORT)s \
    -e PUB_SAMTOOLS_PORT=%(PUB_SAMTOOLS_PORT)s \
    -e PUB_BAMDEPTHER_PORT=%(PUB_BAMDEPTHER_PORT)s \
    -e PUB_BAMMERGER_PORT=%(PUB_BAMMERGER_PORT)s \
    -e PUB_BAMSTATSALIVE_PORT=%(PUB_BAMSTATSALIVE_PORT)s \
    -v %(INPUT_BAMFILE)s:/input/bamfile.bam:ro \
    -v %(INPUT_BAMFILE_INDEX)s:/input/bamfile.bam.bai:ro \
    -v """ % (ENV)

# Inject all port numbers from as environment variable to the iobio container.
# iobio will pick them up and adopt accordingly
docker_cmd = docker_cmd.replace('-v', inject)

ie_request.log.info("Starting BAM.iobio docker container with command [%s]" % docker_cmd)
ie_request.log.info("NOTEBOOK_ACCESS_URL: %s" % notebook_access_url)
subprocess.call(docker_cmd, shell=True)

root = h.url_for( '/' )
%>
<html>
<head>
${ ie.load_default_js() }
</head>
<body>

    <div id="main" width="100%" height="100%">
        <table border="0" height="100%" width="100%">
            <tr><td valign="center" align="center">
                <img src="${root}static/style/largespinner.gif" id="spinner" class="spinner"/>
            </td></tr>
        </table>
    </div>
    <script type="text/javascript">

        $("#spinner").show();

        ${ ie.default_javascript_variables() }
        var notebook_access_url = '${ notebook_access_url }';
        ${ ie.plugin_require_config() }

        toastr.info(
            "BAM io.bio is starting up!",
            "transferring data ...",
            {'closeButton': true, 'timeOut': 10000, 'tapToDismiss': false}
        );

        var hide_spinner = function(){
             $("#spinner").hide();

            // Load notebook
            requirejs(['interactive_environments', 'plugin/bam_iobio'], function(){
                load_notebook(notebook_access_url);
            });

        };
        // sleep 10 seconds
        // this is currently needed to get the vis right
        // plans exists to move this spinner into the container
        setTimeout(hide_spinner, 10000);

    </script>

</body>
</html>
