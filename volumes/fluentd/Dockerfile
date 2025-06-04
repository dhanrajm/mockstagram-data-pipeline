# fluentd/Dockerfile

FROM fluent/fluentd:edge-debian
USER root
RUN gem install \
    'elasticsearch:~> 7.17.0' \
    'elasticsearch-api:~> 7.17.0' \
    'fluent-plugin-elasticsearch:5.4.3' \
    --no-document
    
USER fluent