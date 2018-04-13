# seguir
***seguir*** is a Node.js native "tail" implementation with extensible ETL (Extract, Transform, Load) capabilities. ***seguir*** has been patterned after similar products in the market, namely: [fluentd](https://www.fluentd.org/),  [Sematext's logagent](https://github.com/sematext/logagent-js), [Logstash](https://www.elastic.co/products/logstash), and [Filebeat](https://www.elastic.co/products/beats/filebeat). ***seguir***, like [logagent](https://github.com/sematext/logagent-js) and [Filebeat](https://www.elastic.co/products/beats/filebeat), contains a very low memory footprint and low CPU overhead.

# Supported Platforms

Currently only Linux and/or Unix platforms are supported including Mac OSX.

# Installation

***seguir*** requires Node.js to run. Official instructions on installing Node.js can be found in the [downloads and instructions](https://nodejs.org/en/download/) section. Following is an example of how to install ***seguir*** for for Debian/Ubuntu:

```
curl -sL https://deb.nodesource.com/setup_9.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm i -g @thrivedev/seguir
```

# Running

***seguir*** provides common command line utilities such as help.

```
seguir --help
```

***seguir*** supports both configuration files and command line options. Tailing logs from [nginx](https://www.nginx.com/) is as simple as:

```
seguir -f /var/log/nginx/access.log -O 0 --follow --stdout
```

# Configuration

***seguir*** is configurable by both file and command line options. To configure different ETL capabilities supply a valid configuration file via the ***-c*** command line option.

# Plugins

***seguir*** at its very core is extensible. Custom plugins are encouraged in order to maintain the project's low memory and CPU footprint. Currently only output plugins are supported.

# Documentation

***seguir*** documentation can be found on the [GitHub Wiki](https://github.com/alexandermjames/seguir/wiki).
