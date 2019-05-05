Galaxy Interactive Tools/Environments
=====================================

A GIE is a Docker container, launched by Galaxy, proxied by Galaxy, with some
extra sugar inside the container to allow users to interact easily with their
Galaxy histories if needed.

How GIEs Work
-------------

A GIE is primarily composed of a Docker container, and the Galaxy tools framework.

At first, make sure your Galaxy tool runner does support the Interactive Environments.
Currently, only the **local** runner (which is not recommended for production) and the **condor** runner
do support the IE2.

Make sure to enable the Docker support in your destination.

.. code-block:: xml

        <destination id="condor" runner="condor">
            <param id="docker_enabled">true</param>
            <param id="docker_sudo">false</param>
        </destination>

        <destination id="local" runner="local">
            <param id="docker_enabled">true</param>
            <param id="docker_sudo">false</param>
        </destination>

As a next step, you need to activate the uwsgi proxy by adding the following configurations to your **galaxy.yml** file.
This goes into your **uwsgi:** section.

.. code-block:: yaml
  http-raw-body: true
  # master: true

  realtime_map: database/realtime_map.sqlite
  python-raw: scripts/realtime/key_type_token_mapping.py
  route-host: ^([A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)\.([A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)\.([A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)\.(realtime\.localhost:8080)$ goto:realtime
  route-run: goto:endendend
  route-label: realtime
  route-host: ^([A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)\.([A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)\.([A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)\.(realtime\.localhost:8080)$ rpcvar:TARGET_HOST rtt_key_type_token_mapper_cached $2 $1 $3 $4 $0 5
  route-if-not: empty:${TARGET_HOST} httpdumb:${TARGET_HOST}
  route-label: endendend

And this, into your **galaxy:** section:

.. code-block:: yaml

  realtime_prefix: realtime


Now you can add two test IE tools to your setup by including the following two lines into your tool_conf.xml file.

.. code-block:: xml

    <tool file="../test/functional/tools/interactive_tool_juypter_notebook.xml" />
    <tool file="../test/functional/tools/interactive_tools_cellxgene.xml" />

Thats it. After restarting Galaxy you should be able to use these tools. Each of them will start a Docker container via
the tool dependency mechanism and connects you to it via the uwsgi proxy.

A few words to the condor integration
-------------------------------------

Galaxy needs to be able to stop a container gracefully. This is not a problem with the local job runner, where we assume that Docker is either running on the same host. However, if you are using production scale DRM, like condor, then your job is running
somewhere on your cluster and you can not easily **docker stop** your container. For the condor integration we are using a great
condor feature and commandline utlility called **condor_ssh_to_job**. This tool (assuming your condor setup is configured correctly) will bring us directly to the host in question and we can execute the **docker stop** command. Galaxy will simply run **condor_ssh_to_job <condor_job_id> docker stop <container_name>** to stop the container gracefully.

Also please keep in mind that DRM usually have a max runtime configured for jobs. From the Galaxy point of view such a container could run as long as the user want, obviously this is not scaleable and you need to restrict the runtime of IE (or jobs in general). However, if the job is killed by the DRM the user is not informed beforehand and data in the container could be lost.
