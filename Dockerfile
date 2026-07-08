FROM nginx:alpine

# Copy the custom Nginx configuration file
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static frontend files to Nginx public folder
COPY public/ /usr/share/nginx/html/

EXPOSE 80
