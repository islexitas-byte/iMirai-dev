FROM python:3.11-slim

# set working directory inside container
WORKDIR /app

# copy dependency list
COPY requirements.txt .

# install python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# copy your code
COPY . .

# make python output visible in logs
ENV PYTHONUNBUFFERED=1
