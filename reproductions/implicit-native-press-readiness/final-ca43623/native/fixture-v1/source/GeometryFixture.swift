import UIKit

final class Events {
    static let shared = Events()
    let began = ProcessInfo.processInfo.systemUptime
    var rows: [[String: Any]] = []
    func record(_ event: String, _ fields: [String: Any] = [:]) {
        var row = fields; row["event"] = event; row["ms"] = (ProcessInfo.processInfo.systemUptime-began)*1000
        rows.append(row)
        let directory=FileManager.default.urls(for:.documentDirectory,in:.userDomainMask)[0]
        if let data=try? JSONSerialization.data(withJSONObject:rows,options:[.prettyPrinted,.sortedKeys]) { try? data.write(to:directory.appendingPathComponent("events.json")) }
    }
}
final class OtherControl: UIControl {
    let text=UILabel()
    var eventName="otherReceivedTap"
    override init(frame:CGRect) {
        super.init(frame:frame);isAccessibilityElement=true;accessibilityTraits=[]
        backgroundColor = .systemTeal.withAlphaComponent(0.15)
        text.isAccessibilityElement=false;text.font = .systemFont(ofSize:13);addSubview(text)
        addTarget(self,action:#selector(received),for:.touchUpInside)
    }
    required init?(coder:NSCoder){fatalError()}
    override func layoutSubviews(){super.layoutSubviews();text.frame=bounds.insetBy(dx:8,dy:3)}
    @objc func received(){ Events.shared.record(eventName,["identifier":accessibilityIdentifier ?? ""])}
}
final class TouchCover:UIView { override func touchesBegan(_ touches:Set<UITouch>,with event:UIEvent?){Events.shared.record("coverReceivedTouch");super.touchesBegan(touches,with:event)} }
final class FixtureController:UIViewController,UITableViewDataSource,UITableViewDelegate {
    let titleLabel=UILabel(), result=UILabel(), content=UIView()
    let table=UITableView(frame:.zero,style:.plain), list=UIScrollView()
    var mode="clipped", lastBounds=CGRect.zero
    var buttons:[UIButton]=[]
    var duplicateA=UIButton(type:.system),duplicateB=UIButton(type:.system),cover=TouchCover()
    override func viewDidLoad(){
        super.viewDidLoad();view.backgroundColor = .systemBackground
        titleLabel.text="Readiness maintainer fixture";titleLabel.font = .boldSystemFont(ofSize:20);view.addSubview(titleLabel)
        addButton("Clipped row","mode-clipped",#selector(showClipped))
        addButton("Large Other tree","mode-large",#selector(showLarge))
        addButton("Duplicates","mode-duplicates",#selector(showDuplicates))
        addButton("Landscape","landscape",#selector(landscape))
        addButton("Portrait","portrait",#selector(portrait))
        content.clipsToBounds=true;view.addSubview(content)
        table.dataSource=self;table.delegate=self;table.rowHeight=400;table.contentInsetAdjustmentBehavior = .never
        table.separatorStyle = .none;table.isScrollEnabled=false;table.clipsToBounds=true
        list.contentInsetAdjustmentBehavior = .never;list.clipsToBounds=true
        for index in 0..<500 {
            let control=OtherControl(frame:CGRect(x:0,y:index*42,width:345,height:40))
            control.accessibilityIdentifier=String(format:"other-%03d",index)
            control.accessibilityLabel=String(format:"Other control %03d",index)
            control.text.text=control.accessibilityLabel
            list.addSubview(control)
        }
        result.numberOfLines=0;result.font = .monospacedSystemFont(ofSize:12,weight:.regular);result.accessibilityIdentifier="results";view.addSubview(result)
        configureDuplicate(duplicateA,"duplicate-a",#selector(duplicateATapped));configureDuplicate(duplicateB,"duplicate-b",#selector(duplicateBTapped))
        cover.backgroundColor = .systemOrange.withAlphaComponent(0.65);cover.isAccessibilityElement=false
        setMode("clipped");Events.shared.record("appReady",["otherControlCount":500])
    }
    func addButton(_ title:String,_ id:String,_ action:Selector){let b=UIButton(type:.system);b.setTitle(title,for:.normal);b.accessibilityIdentifier=id;b.backgroundColor = .secondarySystemBackground;b.addTarget(self,action:action,for:.touchUpInside);buttons.append(b);view.addSubview(b)}
    func configureDuplicate(_ b:UIButton,_ id:String,_ action:Selector){b.setTitle("Duplicate action",for:.normal);b.accessibilityIdentifier="duplicate-control";b.backgroundColor = .systemBlue.withAlphaComponent(0.2);b.addTarget(self,action:action,for:.touchUpInside)}
    override func viewDidLayoutSubviews(){
        super.viewDidLayoutSubviews();let w=view.bounds.width
        titleLabel.frame=CGRect(x:24,y:45,width:w-48,height:28)
        for (i,b) in buttons.enumerated(){let row=i/3,col=i%3;b.frame=CGRect(x:24+col*118,y:82+row*42,width:110,height:36)}
        content.frame=CGRect(x:24,y:180,width:min(600,w-48),height:220)
        table.frame=content.bounds;table.contentOffset=CGPoint(x:0,y:330)
        list.frame=content.bounds;list.contentSize=CGSize(width:content.bounds.width,height:500*42)
        for control in list.subviews where control is OtherControl {control.frame.size.width=content.bounds.width}
        duplicateA.frame=CGRect(x:0,y:0,width:content.bounds.width,height:70)
        duplicateB.frame=CGRect(x:0,y:110,width:content.bounds.width,height:70)
        cover.frame=duplicateA.frame
        result.frame=CGRect(x:w>600 ? 640:24,y:w>600 ? 180:420,width:w>600 ? w-664:w-48,height:80)
        if lastBounds != view.bounds {lastBounds=view.bounds;Events.shared.record("geometryChanged",["mode":mode,"viewBounds":String(describing:view.bounds),"orientation":view.window?.windowScene?.interfaceOrientation.rawValue ?? 0]);recordGeometry()}
    }
    func setMode(_ next:String){mode=next;content.subviews.forEach{$0.removeFromSuperview()};if next=="clipped"{content.addSubview(table)}else if next=="large"{content.addSubview(list)}else{content.addSubview(duplicateA);content.addSubview(duplicateB);content.addSubview(cover)};view.setNeedsLayout();view.layoutIfNeeded();result.text="Mode: \(mode)\nOther controls: 500";Events.shared.record("modeChanged",["mode":mode]);recordGeometry()}
    func recordGeometry(){guard let window=view.window else{return};let viewport=content.convert(content.bounds,to:window);var data:[String:Any]=["mode":mode,"viewportWindowLocal":String(describing:viewport)];if mode=="clipped",let cell=table.cellForRow(at:IndexPath(row:0,section:0)){let raw=cell.convert(cell.bounds,to:window);data["targetWindowLocal"]=String(describing:raw);data["visibleIntersectionWindowLocal"]=String(describing:raw.intersection(viewport));data["rawCenterY"]=raw.midY};Events.shared.record("fixtureGeometry",data)}
    @objc func showClipped(){setMode("clipped")}
    @objc func showLarge(){setMode("large")}
    @objc func showDuplicates(){setMode("duplicates")}
    @objc func duplicateATapped(){Events.shared.record("duplicateAReceivedTap")}
    @objc func duplicateBTapped(){Events.shared.record("duplicateBReceivedTap")}
    @objc func landscape(){rotate(.landscapeRight)}
    @objc func portrait(){rotate(.portrait)}
    func rotate(_ mask:UIInterfaceOrientationMask){view.window?.windowScene?.requestGeometryUpdate(.iOS(interfaceOrientations:mask)){e in Events.shared.record("rotationError",["message":e.localizedDescription])};setNeedsUpdateOfSupportedInterfaceOrientations()}
    func tableView(_ tableView:UITableView,numberOfRowsInSection section:Int)->Int{3}
    func tableView(_ tableView:UITableView,cellForRowAt indexPath:IndexPath)->UITableViewCell{let cell=UITableViewCell(style:.default,reuseIdentifier:nil);cell.textLabel?.text=indexPath.row==0 ? "Clipped row":"Filler row \(indexPath.row)";cell.accessibilityIdentifier=indexPath.row==0 ? "clipped-row":"filler-\(indexPath.row)";cell.contentView.backgroundColor=indexPath.row==0 ? .systemBlue.withAlphaComponent(0.18):.secondarySystemBackground;let tail=UILabel(frame:CGRect(x:12,y:350,width:300,height:40));tail.text="Visible tail of row \(indexPath.row)";tail.isAccessibilityElement=false;cell.contentView.addSubview(tail);return cell}
    func tableView(_ tableView:UITableView,didSelectRowAt indexPath:IndexPath){Events.shared.record(indexPath.row==0 ? "clippedRowReceivedTap":"fillerRowReceivedTap",["row":indexPath.row]);tableView.deselectRow(at:indexPath,animated:false)}
}
final class AppDelegate:UIResponder,UIApplicationDelegate{func application(_ application:UIApplication,configurationForConnecting connectingSceneSession:UISceneSession,options:UIScene.ConnectionOptions)->UISceneConfiguration{let c=UISceneConfiguration(name:"Default",sessionRole:connectingSceneSession.role);c.delegateClass=SceneDelegate.self;return c}}
final class SceneDelegate:UIResponder,UIWindowSceneDelegate{var window:UIWindow?;func scene(_ scene:UIScene,willConnectTo session:UISceneSession,options connectionOptions:UIScene.ConnectionOptions){guard let scene=scene as? UIWindowScene else{return};let w=UIWindow(windowScene:scene);w.rootViewController=FixtureController();w.makeKeyAndVisible();window=w}}
UIApplicationMain(CommandLine.argc,CommandLine.unsafeArgv,nil,NSStringFromClass(AppDelegate.self))
