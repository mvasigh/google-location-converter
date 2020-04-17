import React from 'react';
import { useDropzone } from 'react-dropzone';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import SEO from '../components/seo';

import './index.css';

const readAndConvertFile = file =>
  new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const json = JSON.parse(reader.result);
        const timeline = json.timelineObjects.filter(pt => pt.placeVisit);
        const data = timeline.map(({ placeVisit }) => ({
          latitudeE7: placeVisit?.location?.latitudeE7,
          longitudeE7: placeVisit?.location?.longitudeE7,
          placeId: placeVisit?.location?.placeId,
          locationAddress: placeVisit?.location?.address,
          locationName: placeVisit?.location?.address,
          locationConfidence: placeVisit?.location?.locationConfidence,
          durationMs:
            parseInt(placeVisit?.duration?.endTimestampMs ?? 0) -
            parseInt(placeVisit?.duration?.startTimestampMs ?? 0),
          placeConfidence: placeVisit.placeConfidence,
          centerLatE7: placeVisit.centerLatE7,
          centerLngE7: placeVisit.centerLngE7,
          visitConfidence: placeVisit.visitConfidence,
        }));
        const csv = Papa.unparse(data);
        const fileName = file.name.replace(/json/gi, 'csv');
        resolve({ fileName, csv });
      };
      reader.readAsText(file);
    } catch (e) {
      reject(e);
    }
  });

const convertFiles = async filesArr => {
  const zip = new JSZip();

  // Convert each JSON to CSV and add to the zip
  for (let file of filesArr) {
    const { fileName, csv } = await readAndConvertFile(file);
    zip.file(fileName, csv + '\n');
  }

  // Save the zip
  return zip
    .generateAsync({ type: 'blob' })
    .then(content => saveAs(content, 'location_data.zip'));
};

const IndexPage = () => {
  const [files, setFiles] = React.useState([]);
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const onDrop = React.useCallback(acceptedFiles => {
    setFiles(acceptedFiles);
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handleFormSubmit = e => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    convertFiles(files)
      .then(() => {
        setLoading(false);
        setError(null);
        setFiles([]);
      })
      .catch(e => {
        setLoading(false);
        setError(e);
        setFiles([]);
      });
  };

  return (
    <div className="container">
      <SEO title="Home" />
      <h1>Google Location History Converter</h1>
      <p>Convert your Google location history from JSON to a CSV spreadsheet</p>
      <form onSubmit={handleFormSubmit} className="form">
        <div className="file-picker" {...getRootProps()}>
          <input disabled={loading} {...getInputProps()} />
          {isDragActive ? (
            <p>Drop the files here ...</p>
          ) : (
            <p>
              {files.length
                ? files.map(file => <li key={file.path}>{file.name}</li>)
                : `Drag 'n' drop your "semantic location history" JSON file here (or click to select)`}
            </p>
          )}
        </div>
        <button disabled={!files.length || loading}>Convert</button>
        {error && (
          <p className="error">
            {error?.message ?? 'An unknown error occured, please try again'}
          </p>
        )}
      </form>
    </div>
  );
};

export default IndexPage;
