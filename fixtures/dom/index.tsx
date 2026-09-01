import "./index.css";

const DomComp = (props: any) => {
  return (
    <div className="demo">
      <h1>Reconciler Demo</h1>
      <p>stage {props.stage}</p>
    </div>
  );
};

export default DomComp;
